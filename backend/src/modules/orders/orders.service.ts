import type { PrismaClient, OrderStatus, Prisma } from "@prisma/client";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnprocessableError,
  ValidationError,
} from "../../lib/errors.js";
import { OrdersRepository } from "./orders.repository.js";
import { SubscriptionsService } from "../subscriptions/subscriptions.service.js";
import type { CreateOrderDto, UpdateOrderStatusDto } from "./orders.dto.js";

const TERMINAL_STATUSES: OrderStatus[] = [
  "approved",
  "rejected",
  "expired",
  "cancelled",
];

/** Order TTL — pending orders auto-expire after this window. */
const ORDER_TTL_HOURS = 24;

export class OrdersService {
  private readonly repo: OrdersRepository;
  private readonly subs: SubscriptionsService;

  constructor(private readonly prisma: PrismaClient) {
    this.repo = new OrdersRepository(prisma);
    this.subs = new SubscriptionsService(prisma);
  }

  listForUser(userId: string) {
    return this.repo.listForUser(userId);
  }

  listForAdmin(params: { status?: OrderStatus; skip?: number; take?: number }) {
    return this.repo.listForAdmin(params);
  }

  async getById(id: string, requesterId: string, requesterRole: string) {
    const order = await this.repo.findById(id);
    if (!order) throw new NotFoundError("Order", id);
    if (
      order.userId !== requesterId &&
      requesterRole !== "admin" &&
      requesterRole !== "operator"
    ) {
      throw new ForbiddenError();
    }
    return order;
  }

  async create(userId: string, dto: CreateOrderDto) {
    const [plan, country, requisite] = await Promise.all([
      this.prisma.plan.findUnique({ where: { id: dto.planId } }),
      this.prisma.country.findUnique({ where: { code: dto.countryCode } }),
      this.prisma.paymentRequisite.findUnique({ where: { id: dto.requisiteId } }),
    ]);

    if (!plan || !plan.active) throw new ValidationError("Unknown or inactive plan");
    if (!country || !country.active)
      throw new ValidationError("Unknown or inactive country");
    if (!requisite || !requisite.active || requisite.deletedAt)
      throw new ValidationError("Unknown or inactive payment requisite");

    // Reject a fresh order if the user already has a pending one — prevents
    // accidental double-clicks producing duplicate moderation queue items.
    const existingPending = await this.prisma.order.findFirst({
      where: { userId, status: { in: ["pending", "processing"] } },
    });
    if (existingPending) {
      throw new ConflictError("You already have an open order awaiting review", {
        orderId: existingPending.id,
      });
    }

    return this.repo.create({
      user: { connect: { id: userId } },
      plan: { connect: { id: plan.id } },
      country: { connect: { code: country.code } },
      requisite: { connect: { id: requisite.id } },
      amount: plan.priceUsd,
      currency: "USD",
      status: "pending",
      expiresAt: new Date(Date.now() + ORDER_TTL_HOURS * 60 * 60 * 1000),
    });
  }

  /**
   * Admin/operator status transition. On `approved`, atomically creates the
   * subscription and notifies the user. Bumps the requisite's running total.
   */
  async setStatus(
    orderId: string,
    actorId: string,
    dto: UpdateOrderStatusDto,
  ) {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundError("Order", orderId);

    if (TERMINAL_STATUSES.includes(order.status)) {
      throw new UnprocessableError(`Order is already ${order.status}`);
    }

    const patch: Prisma.OrderUpdateInput = {
      status: dto.status,
      reviewedAt: new Date(),
      reviewedById: actorId,
      ...(dto.note !== undefined ? { note: dto.note } : {}),
      ...(dto.noteKey !== undefined ? { noteKey: dto.noteKey } : {}),
      ...(dto.paymentReference !== undefined
        ? { paymentReference: dto.paymentReference }
        : {}),
      ...(dto.paymentReferenceKey !== undefined
        ? { paymentReferenceKey: dto.paymentReferenceKey }
        : {}),
    };

    if (dto.status !== "approved") {
      // ── REJECT / CANCEL / EXPIRE path ────────────────────────────────────
      // Order update + (optional) notification + audit row must all commit
      // together; a partial write would leave moderators with an order in
      // status X but no audit trail of who moved it there.
      return this.prisma.$transaction(async (tx) => {
        const updated = await tx.order.update({
          where: { id: orderId },
          data: patch,
          include: { user: true, plan: true, country: true },
        });

        if (dto.status === "rejected") {
          await tx.notification.create({
            data: {
              userId: updated.userId,
              kind: "order_rejected",
              titleKey: "notifications.orderRejected.title",
              bodyKey: "notifications.orderRejected.body",
              payload: { orderId: updated.id, reasonKey: dto.noteKey ?? null },
            },
          });
        }

        await this.recordAdminActionTx(tx, actorId, dto.status, updated.id);
        return updated;
      });
    }

    // ── APPROVE path ──────────────────────────────────────────────────────
    // Single transaction: update order → create subscription → bump
    // requisite total → notify → audit. Anything that throws rolls
    // everything back, including the upstream VPN provisioning call's row
    // — though note we cannot un-mint a real Marzban user; see README for
    // the at-least-once semantics caveat.
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: patch,
        include: { user: true, plan: true, country: true },
      });

      const subscription = await this.subs.createFromOrder(updated, {
        tx: tx as unknown as PrismaClient,
      });

      await tx.paymentRequisite.update({
        where: { id: updated.paymentRequisiteId },
        data: { receivedTotalUsd: { increment: updated.amount } },
      });

      await tx.notification.create({
        data: {
          userId: updated.userId,
          kind: "subscription_activated",
          titleKey: "notifications.subscriptionActivated.title",
          bodyKey: "notifications.subscriptionActivated.body",
          payload: {
            orderId: updated.id,
            subscriptionId: subscription.id,
            subscriptionUrl: subscription.subscriptionUrl,
          },
        },
      });

      await this.recordAdminActionTx(tx, actorId, "approved", updated.id);
      return updated;
    });
  }

  /** Convenience helper used by the legacy “mark paid” call on the frontend. */
  async markPaidByUser(orderId: string, userId: string) {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundError("Order", orderId);
    if (order.userId !== userId) throw new ForbiddenError();
    if (order.status !== "pending") {
      throw new UnprocessableError(`Order is not pending (current: ${order.status})`);
    }
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: "processing" },
      include: { user: true, plan: true, country: true },
    });
  }

  private async recordAdminActionTx(
    tx: Prisma.TransactionClient,
    actorId: string,
    status: UpdateOrderStatusDto["status"],
    orderId: string,
  ) {
    const kindMap = {
      approved: "order_approve",
      rejected: "order_reject",
      cancelled: "order_cancel",
    } as const;
    const kind = (kindMap as Partial<Record<UpdateOrderStatusDto["status"], string>>)[status];
    if (!kind) return;
    await tx.adminAction.create({
      data: {
        actorId,
        kind: kind as "order_approve" | "order_reject" | "order_cancel",
        targetType: "order",
        targetId: orderId,
      },
    });
  }
}
