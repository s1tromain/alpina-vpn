import type { PrismaClient } from "@prisma/client";
import { SubscriptionsRepository } from "./subscriptions.repository.js";
import { getVpnProvider } from "../vpn/index.js";
import { ConflictError, NotFoundError, UnprocessableError } from "../../lib/errors.js";
import type { Order, Plan, Subscription, User } from "@prisma/client";

const DURATION_DAYS: Record<Plan["duration"], number> = {
  m1: 30,
  m3: 90,
  m6: 180,
  m12: 365,
};

/**
 * Subscription lifecycle.
 *
 *   pending order ─approve─▶ createFromOrder ─▶ active
 *                              │
 *                              ├─ suspendSubscription ─▶ suspended ─resume─▶ active
 *                              ├─ expireSubscription  ─▶ expired
 *                              └─ revokeSubscription  ─▶ (deleted; upstream revoked)
 *
 * Every state transition either matches a provider call (`MockVpnProvider`
 * is a no-op) or guards against a no-op transition.
 */
export class SubscriptionsService {
  private readonly repo: SubscriptionsRepository;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new SubscriptionsRepository(prisma);
  }

  findCurrentForUser(userId: string) {
    return this.repo.findCurrentForUser(userId);
  }

  findById(id: string) {
    return this.repo.findById(id);
  }

  /**
   * Create a subscription tied to an approved order. Calls the configured
   * VPN provider to mint a subscriptionUrl. Caller is expected to pass a
   * transaction client so the whole order-approval flow stays atomic.
   *
   * Refuses to create a second active subscription for the same user — the
   * frontend's UI assumes exactly one active subscription per profile.
   */
  async createFromOrder(
    order: Order & { plan: Plan },
    opts: { tx?: PrismaClient } = {},
  ) {
    const tx = (opts.tx ?? this.prisma) as PrismaClient;
    const provider = getVpnProvider();

    const existingActive = await tx.subscription.findFirst({
      where: { userId: order.userId, status: "active" },
      select: { id: true },
    });
    if (existingActive) {
      throw new ConflictError(
        "User already has an active subscription — suspend or expire it first",
        { subscriptionId: existingActive.id },
      );
    }

    const user = await tx.user.findUniqueOrThrow({ where: { id: order.userId } });

    const durationDays = DURATION_DAYS[order.plan.duration];
    const result = await provider.provision({
      userId: user.id,
      telegramId: user.telegramId.toString(),
      planSlug: order.plan.slug,
      countryCode: order.countryCode,
      durationDays,
      trafficLimitBytes: order.plan.trafficLimit ?? null,
      maxDevices: order.plan.maxDevices,
    });

    return tx.subscription.create({
      data: {
        userId: order.userId,
        planId: order.planId,
        countryCode: order.countryCode,
        orderId: order.id,
        status: "active",
        startedAt: new Date(),
        expiresAt: result.expiresAt,
        subscriptionUrl: result.subscriptionUrl,
        maxDevices: order.plan.maxDevices,
        trafficLimit: order.plan.trafficLimit ?? null,
        marzbanUserId: result.externalUserId,
      },
      include: { plan: true, country: true },
    });
  }

  /**
   * Pause an active subscription. Idempotent — calling on an already-suspended
   * sub returns it untouched. Calling on expired/revoked raises 422.
   */
  async suspendSubscription(id: string, reason?: string) {
    const sub = await this.requireSubscription(id);
    if (sub.status === "suspended") return sub;
    if (sub.status !== "active") {
      throw new UnprocessableError(
        `Cannot suspend subscription in status "${sub.status}"`,
      );
    }
    const updated = await this.repo.updateStatus(id, "suspended", reason);
    if (updated.marzbanUserId) {
      await getVpnProvider().suspend(updated.marzbanUserId);
    }
    return updated;
  }

  /**
   * Re-enable a previously-suspended subscription. Idempotent on active.
   * Refuses to resume past `expiresAt` — operator should issue a new order.
   */
  async resumeSubscription(id: string) {
    const sub = await this.requireSubscription(id);
    if (sub.status === "active") return sub;
    if (sub.status !== "suspended") {
      throw new UnprocessableError(
        `Cannot resume subscription in status "${sub.status}"`,
      );
    }
    if (sub.expiresAt.getTime() <= Date.now()) {
      throw new UnprocessableError(
        "Subscription has already passed its expiry — create a new order",
      );
    }
    const updated = await this.repo.updateStatus(id, "active");
    if (updated.marzbanUserId) {
      await getVpnProvider().resume(updated.marzbanUserId);
    }
    return updated;
  }

  /**
   * Mark a subscription as expired. Used by the scheduled job that scans
   * for past-due active subs, and by admins acting manually. Idempotent.
   */
  async expireSubscription(id: string) {
    const sub = await this.requireSubscription(id);
    if (sub.status === "expired") return sub;
    if (sub.status === "active" && sub.expiresAt.getTime() > Date.now()) {
      throw new UnprocessableError(
        "Subscription has not yet reached its expiry timestamp",
      );
    }
    const updated = await this.repo.updateStatus(id, "expired");
    if (updated.marzbanUserId) {
      // Don't revoke — keep the upstream record so the user can re-purchase
      // and we can attribute usage history. Just disable.
      await getVpnProvider().suspend(updated.marzbanUserId);
    }
    return updated;
  }

  /**
   * Permanent removal. Asks the upstream provider to delete the user, then
   * deletes the row. Used for fraud, refunds, account closure. NOT reversible.
   */
  async revokeSubscription(id: string): Promise<{ id: string; revoked: true }> {
    const sub = await this.requireSubscription(id);

    if (sub.marzbanUserId) {
      await getVpnProvider().revoke(sub.marzbanUserId);
    }

    await this.repo.delete(sub.id);
    return { id: sub.id, revoked: true };
  }

  /**
   * Background job entrypoint — call from a cron/worker. Finds any active
   * subscription whose expiresAt is now in the past and transitions it to
   * `expired`. Returns the count of transitions for the caller to log.
   * Calls the optional `onExpire` hook AFTER the DB update so callers
   * (e.g. the Telegram notifier) can DM the user without blocking the row.
   */
  async expireDueSubscriptions(
    onExpire?: (sub: Subscription & { plan: Plan; country: { code: string; name: string } }) => Promise<void>,
  ): Promise<number> {
    const due = await this.repo.findExpiringBefore(new Date());
    let count = 0;
    for (const sub of due) {
      try {
        const updated = await this.expireSubscription(sub.id);
        count++;
        if (onExpire) {
          // Notify after the DB transition. Hook is responsible for its
          // own try/catch — a notifier hiccup must not block the sweep.
          await onExpire(updated).catch(() => {
            /* hook logs upstream */
          });
        }
      } catch {
        // Skip individual failures — a single bad row shouldn't halt the sweep.
        // The error handler logs upstream; the sweep should keep going.
      }
    }
    return count;
  }

  /**
   * Find subscriptions whose `expiresAt` falls in the window
   *   (now + minDays - 1 day, now + minDays]
   * — i.e. those crossing the `minDays`-left threshold today. Used by the
   * daily reminder sweep to DM users 3 days and 1 day before expiry.
   *
   * We use a 24h window (not "exactly N days") so a single missed run
   * (deploy lag, container restart) doesn't cause us to drop the
   * notification for that day's cohort.
   */
  async findExpiringInDays(minDays: number) {
    const now = Date.now();
    const to = new Date(now + minDays * 24 * 60 * 60 * 1000);
    const from = new Date(now + (minDays - 1) * 24 * 60 * 60 * 1000);
    return this.repo.findExpiringBetween(from, to);
  }

  private async requireSubscription(id: string): Promise<
    Subscription & { plan: Plan; country: { code: string; name: string } }
  > {
    const sub = await this.repo.findById(id);
    if (!sub) throw new NotFoundError("Subscription", id);
    return sub;
  }
}
