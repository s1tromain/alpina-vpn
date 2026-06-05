import type { PrismaClient } from "@prisma/client";
import { ForbiddenError } from "../../lib/errors.js";

export interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  revenueUsd: number;
  revenueDeltaPct: number;
  approvedPayments: number;
  rejectedPayments: number;
  pendingPayments: number;
  serversOnline: number;
  serversTotal: number;
}

const MS_PER_DAY = 86_400_000;

export class AdminService {
  constructor(private readonly prisma: PrismaClient) {}

  async stats(): Promise<AdminStats> {
    const now = new Date();
    const currentPeriodStart = new Date(now.getTime() - 30 * MS_PER_DAY);
    const previousPeriodStart = new Date(now.getTime() - 60 * MS_PER_DAY);

    const [
      totalUsers,
      activeSubscriptions,
      approvedAgg,
      previousAgg,
      approvedCount,
      rejectedCount,
      pendingCount,
      serversOnline,
      serversTotal,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.subscription.count({ where: { status: "active" } }),
      // Revenue & "approved" counts track orders that successfully became
      // ACTIVE (a moderator approval that provisioned a live subscription).
      this.prisma.order.aggregate({
        where: {
          status: "active",
          reviewedAt: { gte: currentPeriodStart },
        },
        _sum: { amount: true },
      }),
      this.prisma.order.aggregate({
        where: {
          status: "active",
          reviewedAt: { gte: previousPeriodStart, lt: currentPeriodStart },
        },
        _sum: { amount: true },
      }),
      this.prisma.order.count({ where: { status: "active" } }),
      this.prisma.order.count({ where: { status: "rejected" } }),
      this.prisma.order.count({
        where: { status: { in: ["created", "pending"] } },
      }),
      this.prisma.vpnServer.count({ where: { status: "online" } }),
      this.prisma.vpnServer.count(),
    ]);

    const current = Number(approvedAgg._sum.amount ?? 0);
    const previous = Number(previousAgg._sum.amount ?? 0);
    const revenueDeltaPct =
      previous === 0 ? (current > 0 ? 100 : 0) : ((current - previous) / previous) * 100;

    return {
      totalUsers,
      activeSubscriptions,
      revenueUsd: current,
      revenueDeltaPct: Math.round(revenueDeltaPct * 10) / 10,
      approvedPayments: approvedCount,
      rejectedPayments: rejectedCount,
      pendingPayments: pendingCount,
      serversOnline,
      serversTotal,
    };
  }

  /**
   * Promote/demote a user and emit an `admin_actions` audit row. Both
   * statements must commit together — a role change without an audit row
   * is a compliance bug, and an audit row without a real change confuses
   * incident review.
   */
  async setUserRole(
    actorId: string,
    userId: string,
    role: "user" | "operator" | "admin",
  ) {
    if (actorId === userId) {
      // Defensive: never let an admin demote themselves via this endpoint —
      // doing so risks locking the org out of role management. Done via
      // direct DB if genuinely needed.
      throw new ForbiddenError("Cannot change your own role");
    }

    return this.prisma.$transaction(async (tx) => {
      const before = await tx.user.findUniqueOrThrow({ where: { id: userId } });
      if (before.role === role) return before;

      const updated = await tx.user.update({
        where: { id: userId },
        data: { role },
      });
      await tx.adminAction.create({
        data: {
          actorId,
          kind: "user_role_change",
          targetType: "user",
          targetId: userId,
          metadata: { from: before.role, to: role },
        },
      });
      return updated;
    });
  }

  /**
   * Block / unblock a user. Blocking stamps `bannedAt` (so the auth plugin
   * rejects the account on its next request) and records an optional reason;
   * unblocking clears both. Self-ban is refused for the same lock-out reason
   * as self-role-change.
   */
  async setUserBan(
    actorId: string,
    userId: string,
    banned: boolean,
    reason?: string,
  ) {
    if (actorId === userId) {
      throw new ForbiddenError("Cannot block your own account");
    }

    const before = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    const alreadyInState = banned === (before.bannedAt !== null);
    if (alreadyInState) return before;

    return this.prisma.user.update({
      where: { id: userId },
      data: banned
        ? { bannedAt: new Date(), banReason: reason ?? null }
        : { bannedAt: null, banReason: null },
    });
  }
}
