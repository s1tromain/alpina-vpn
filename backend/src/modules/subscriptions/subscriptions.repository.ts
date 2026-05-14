import type { PrismaClient, Prisma } from "@prisma/client";

export class SubscriptionsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  findCurrentForUser(userId: string) {
    return this.prisma.subscription.findFirst({
      where: { userId, status: { in: ["active", "suspended"] } },
      orderBy: { createdAt: "desc" },
      include: { plan: true, country: true },
    });
  }

  create(data: Prisma.SubscriptionCreateInput) {
    return this.prisma.subscription.create({
      data,
      include: { plan: true, country: true },
    });
  }

  updateStatus(id: string, status: "active" | "expired" | "suspended", reason?: string) {
    return this.prisma.subscription.update({
      where: { id },
      data: {
        status,
        suspendedAt: status === "suspended" ? new Date() : null,
        suspendedReason: status === "suspended" ? reason ?? null : null,
      },
      include: { plan: true, country: true },
    });
  }

  findExpiringBefore(date: Date) {
    return this.prisma.subscription.findMany({
      where: { status: "active", expiresAt: { lte: date } },
      include: { plan: true, country: true, user: true },
    });
  }

  findById(id: string) {
    return this.prisma.subscription.findUnique({
      where: { id },
      include: { plan: true, country: true },
    });
  }

  findActiveByUserId(userId: string) {
    return this.prisma.subscription.findFirst({
      where: { userId, status: "active" },
      include: { plan: true, country: true },
    });
  }

  /** Hard delete — only used by revoke when the upstream provider has confirmed removal. */
  delete(id: string) {
    return this.prisma.subscription.delete({ where: { id } });
  }
}
