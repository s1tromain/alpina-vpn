import { Prisma, type NotificationKind, type PrismaClient } from "@prisma/client";

export interface CreateNotificationData {
  userId: string;
  kind: NotificationKind;
  titleKey: string;
  bodyKey?: string | null;
  payload?: Prisma.InputJsonValue | null;
}

/** Thin data-access layer for notifications — keeps Prisma JSON quirks contained. */
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaClient) {}

  create(data: CreateNotificationData) {
    return this.prisma.notification.create({
      data: {
        userId: data.userId,
        kind: data.kind,
        titleKey: data.titleKey,
        bodyKey: data.bodyKey ?? null,
        // Prisma.JsonNull is the only way to write SQL NULL to a Json column;
        // omitting the field would leave the prior value untouched on update,
        // but on create the column would default. We pass JsonNull explicitly.
        payload: data.payload ?? Prisma.JsonNull,
      },
    });
  }

  listForUser(userId: string, params: { unreadOnly?: boolean; take?: number } = {}) {
    const { unreadOnly = false, take = 100 } = params;
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { readAt: null } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: Math.min(take, 200),
    });
  }

  countUnread(userId: string) {
    return this.prisma.notification.count({
      where: { userId, readAt: null },
    });
  }

  markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  markRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
