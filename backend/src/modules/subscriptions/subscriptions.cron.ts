import type { FastifyInstance } from "fastify";
import { SubscriptionsService } from "./subscriptions.service.js";

/**
 * In-process periodic sweep for past-due subscriptions + upcoming-expiry
 * reminders.
 *
 *   Expiry sweep:      every `expireIntervalMs` (default 5 min)
 *                      transitions any active subscription past `expiresAt`
 *                      to `expired` and DMs the user once.
 *
 *   Reminder sweep:    every `reminderIntervalMs` (default 6 hours)
 *                      scans for active subs landing in the (now+2d, now+3d]
 *                      and (now, now+1d] windows and DMs the user. The
 *                      24-hour windows are deliberate so a single missed
 *                      run doesn't drop the day's cohort. Each user only
 *                      gets one reminder per threshold because the next
 *                      sweep finds them in a different window.
 *
 *  - We intentionally do NOT use node-cron / BullMQ for the MVP — adding
 *    another dependency or a sidecar worker is overkill for a single
 *    backend container. Promote to a dedicated worker once horizontal
 *    scaling is on the roadmap.
 *  - Each pass uses a try/catch so a transient DB outage doesn't kill
 *    the timer (which would leave us stuck until the next deploy).
 */
const DEFAULT_EXPIRE_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_REMINDER_INTERVAL_MS = 6 * 60 * 60 * 1000;

export function startSubscriptionExpirySweep(
  app: FastifyInstance,
  opts: { expireIntervalMs?: number; reminderIntervalMs?: number } = {},
) {
  const expireIntervalMs = opts.expireIntervalMs ?? DEFAULT_EXPIRE_INTERVAL_MS;
  const reminderIntervalMs = opts.reminderIntervalMs ?? DEFAULT_REMINDER_INTERVAL_MS;
  const service = new SubscriptionsService(app.prisma);

  let expireRunning = false;
  let reminderRunning = false;

  const expireTick = async () => {
    if (expireRunning) return; // skip overlapping runs
    expireRunning = true;
    try {
      const expired = await service.expireDueSubscriptions(async (sub) => {
        try {
          // Telegram decorator is registered before this cron starts, so
          // it's always available — `isLive` guards no-op in disabled mode.
          const userRow = await app.prisma.user.findUnique({
            where: { id: sub.userId },
            select: { telegramId: true },
          });
          if (userRow) {
            await app.telegram.notifier.subscriptionExpiredDm(userRow.telegramId);
          }
        } catch (err) {
          app.log.warn({ err, subId: sub.id }, "subscription_expired_dm_failed");
        }
      });
      if (expired > 0) {
        app.log.info({ expired }, "subscription_expiry_sweep");
      }
    } catch (err) {
      app.log.error({ err }, "subscription_expiry_sweep_failed");
    } finally {
      expireRunning = false;
    }
  };

  const reminderTick = async () => {
    if (reminderRunning) return;
    reminderRunning = true;
    try {
      for (const threshold of [3, 1]) {
        const cohort = await service.findExpiringInDays(threshold);
        for (const sub of cohort) {
          try {
            await app.telegram.notifier.subscriptionExpiringDm(sub.user.telegramId, {
              daysLeft: threshold,
              expiresAt: sub.expiresAt,
            });
          } catch (err) {
            app.log.warn(
              { err, subId: sub.id, threshold },
              "subscription_expiring_dm_failed",
            );
          }
        }
        if (cohort.length > 0) {
          app.log.info(
            { threshold, sent: cohort.length },
            "subscription_reminder_sweep",
          );
        }
      }
    } catch (err) {
      app.log.error({ err }, "subscription_reminder_sweep_failed");
    } finally {
      reminderRunning = false;
    }
  };

  // Boot ticks — catch anything that expired or needs reminding while
  // we were down. Wrapped in `void` so Fastify boot doesn't await them.
  void expireTick();
  void reminderTick();

  const expireHandle = setInterval(() => void expireTick(), expireIntervalMs);
  const reminderHandle = setInterval(() => void reminderTick(), reminderIntervalMs);
  // Don't keep the process alive solely for these timers.
  expireHandle.unref();
  reminderHandle.unref();

  app.addHook("onClose", async () => {
    clearInterval(expireHandle);
    clearInterval(reminderHandle);
  });
}
