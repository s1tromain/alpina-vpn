import type { NotificationKind, PrismaClient, Prisma } from "@prisma/client";
import {
  NotificationsRepository,
  type CreateNotificationData,
} from "./notifications.repository.js";

/**
 * Domain operations over notifications. Routes call the service; the
 * service is the only thing that knows about repository shape. Order
 * approval and rejection paths call `create()` inline within their
 * transactions, passing the active tx client to preserve atomicity.
 */
export class NotificationsService {
  private readonly repo: NotificationsRepository;

  constructor(prisma: PrismaClient) {
    this.repo = new NotificationsRepository(prisma);
  }

  create(args: {
    userId: string;
    kind: NotificationKind;
    titleKey: string;
    bodyKey?: string;
    payload?: Prisma.InputJsonValue;
  }) {
    const data: CreateNotificationData = {
      userId: args.userId,
      kind: args.kind,
      titleKey: args.titleKey,
      bodyKey: args.bodyKey ?? null,
      payload: args.payload ?? null,
    };
    return this.repo.create(data);
  }

  listForUser(userId: string, params: { unreadOnly?: boolean } = {}) {
    return this.repo.listForUser(userId, params);
  }

  countUnread(userId: string) {
    return this.repo.countUnread(userId);
  }

  markAllRead(userId: string) {
    return this.repo.markAllRead(userId);
  }

  markRead(id: string, userId: string) {
    return this.repo.markRead(id, userId);
  }
}
