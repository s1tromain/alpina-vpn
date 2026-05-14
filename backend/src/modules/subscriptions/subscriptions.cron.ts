import type { FastifyInstance } from "fastify";
import { SubscriptionsService } from "./subscriptions.service.js";

/**
 * In-process periodic sweep for past-due subscriptions.
 *
 * Calls `SubscriptionsService.expireDueSubscriptions()` once on boot
 * (catches anything that expired while the process was down) and then
 * every `intervalMs` thereafter. Cleanup runs from the Fastify `onClose`
 * hook so the timer doesn't keep the process alive during shutdown.
 *
 *  - Default cadence: 5 minutes. Subscription expiry granularity is
 *    "good enough" at this resolution and we keep DB chatter low.
 *  - We intentionally do NOT use node-cron / BullMQ for the MVP — adding
 *    another dependency or a sidecar worker is overkill for a single
 *    backend container. Promote to a dedicated worker once horizontal
 *    scaling is on the roadmap.
 *  - Each pass uses a try/catch so a transient DB outage doesn't kill
 *    the timer (which would leave us stuck until the next deploy).
 */
const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

export function startSubscriptionExpirySweep(
  app: FastifyInstance,
  opts: { intervalMs?: number } = {},
) {
  const intervalMs = opts.intervalMs ?? DEFAULT_INTERVAL_MS;
  const service = new SubscriptionsService(app.prisma);
  let running = false;

  const tick = async () => {
    if (running) return; // skip overlapping runs
    running = true;
    try {
      const expired = await service.expireDueSubscriptions();
      if (expired > 0) {
        app.log.info({ expired }, "subscription_expiry_sweep");
      }
    } catch (err) {
      app.log.error({ err }, "subscription_expiry_sweep_failed");
    } finally {
      running = false;
    }
  };

  // Boot tick — catches anything that expired while we were down.
  void tick();

  const handle = setInterval(() => void tick(), intervalMs);
  // Don't keep the process alive solely for this timer.
  handle.unref();

  app.addHook("onClose", async () => {
    clearInterval(handle);
  });
}
