import type { PrismaClient, OrderStatus, Prisma, Subscription } from "@prisma/client";
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
import type { OrderWithRelations } from "../users/users.mapper.js";

/**
 * Side-effect callbacks fired AFTER the DB transaction has committed. Kept
 * optional so unit tests, the admin panel, and the Telegram bot can each
 * call OrdersService without dragging in the Telegram stack. The routes
 * layer wires the concrete handlers (`ModerationService`, `TelegramNotifier`).
 */
export interface OrdersSideEffects {
  onOrderCreated?: (order: OrderWithRelations) => Promise<void> | void;
  onOrderProcessing?: (order: OrderWithRelations) => Promise<void> | void;
  onOrderResolved?: (
    order: OrderWithRelations,
    decision: { status: "approved" | "rejected" | "cancelled" | "expired"; reviewerName?: string; reasonLabel?: string },
    subscription: Subscription | null,
  ) => Promise<void> | void;
}

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
  private readonly sideEffects: OrdersSideEffects;

  constructor(
    private readonly prisma: PrismaClient,
    sideEffects: OrdersSideEffects = {},
  ) {
    this.repo = new OrdersRepository(prisma);
    this.subs = new SubscriptionsService(prisma);
    this.sideEffects = sideEffects;
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

    const created = await this.repo.create({
      user: { connect: { id: userId } },
      plan: { connect: { id: plan.id } },
      country: { connect: { code: country.code } },
      requisite: { connect: { id: requisite.id } },
      amount: plan.priceUsd,
      currency: "USD",
      status: "pending",
      expiresAt: new Date(Date.now() + ORDER_TTL_HOURS * 60 * 60 * 1000),
    });

    // Fire-and-forget post-commit hook — never blocks the API response on
    // Telegram availability. Errors are swallowed by the registered handler.
    if (this.sideEffects.onOrderCreated) {
      void Promise.resolve(this.sideEffects.onOrderCreated(created)).catch(() => {
        /* hook owner is responsible for its own logging */
      });
    }

    return created;
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
      const updated = await this.prisma.$transaction(async (tx) => {
        const row = await tx.order.update({
          where: { id: orderId },
          data: patch,
          include: { user: true, plan: true, country: true },
        });

        if (dto.status === "rejected") {
          await tx.notification.create({
            data: {
              userId: row.userId,
              kind: "order_rejected",
              titleKey: "notifications.orderRejected.title",
              bodyKey: "notifications.orderRejected.body",
              payload: { orderId: row.id, reasonKey: dto.noteKey ?? null },
            },
          });
        }

        await this.recordAdminActionTx(tx, actorId, dto.status, row.id);
        return row;
      });

      // After-commit side effects: edit moderation card, DM user.
      // `dto.status` here is one of "pending" | "processing" | "rejected" |
      // "cancelled" | "expired"; the post-commit hook only fires for the
      // terminal kinds the bot/admin UI knows how to render.
      if (
        this.sideEffects.onOrderResolved &&
        (dto.status === "rejected" || dto.status === "cancelled" || dto.status === "expired")
      ) {
        const reviewerName = await this.lookupReviewerName(actorId);
        void Promise.resolve(
          this.sideEffects.onOrderResolved(
            updated,
            {
              status: dto.status,
              reviewerName,
              ...(dto.note ? { reasonLabel: dto.note } : {}),
            },
            null,
          ),
        ).catch(() => {
          /* hook owner logs */
        });
      }

      return updated;
    }

    // ── APPROVE path ──────────────────────────────────────────────────────
    // Single transaction: update order → create subscription → bump
    // requisite total → notify → audit. Anything that throws rolls
    // everything back, including the upstream VPN provisioning call's row
    // — though note we cannot un-mint a real Marzban user; see README for
    // the at-least-once semantics caveat.
    const { updated, subscription } = await this.prisma.$transaction(async (tx) => {
      const row = await tx.order.update({
        where: { id: orderId },
        data: patch,
        include: { user: true, plan: true, country: true },
      });

      const sub = await this.subs.createFromOrder(row, {
        tx: tx as unknown as PrismaClient,
      });

      await tx.paymentRequisite.update({
        where: { id: row.paymentRequisiteId },
        data: { receivedTotalUsd: { increment: row.amount } },
      });

      await tx.notification.create({
        data: {
          userId: row.userId,
          kind: "subscription_activated",
          titleKey: "notifications.subscriptionActivated.title",
          bodyKey: "notifications.subscriptionActivated.body",
          payload: {
            orderId: row.id,
            subscriptionId: sub.id,
            subscriptionUrl: sub.subscriptionUrl,
          },
        },
      });

      await this.recordAdminActionTx(tx, actorId, "approved", row.id);
      return { updated: row, subscription: sub };
    });

    if (this.sideEffects.onOrderResolved) {
      const reviewerName = await this.lookupReviewerName(actorId);
      void Promise.resolve(
        this.sideEffects.onOrderResolved(
          updated,
          { status: "approved", reviewerName },
          subscription,
        ),
      ).catch(() => {
        /* hook owner logs */
      });
    }

    return updated;
  }

  private async lookupReviewerName(actorId: string): Promise<string> {
    const actor = await this.prisma.user.findUnique({
      where: { id: actorId },
      select: { username: true, firstName: true },
    });
    if (!actor) return "system";
    return actor.username ? `@${actor.username}` : actor.firstName;
  }

  /**
   * User-initiated cancel: only allowed while the order is still actionable
   * (`pending` / `processing`). Transitions to `cancelled` with the canned
   * `cancelledByCustomer` note key and fires the same resolved-hook the
   * admin flow uses, so the Telegram moderation card is also cleared.
   */
  async cancelByUser(orderId: string, userId: string) {
    const order = await this.repo.findById(orderId);
    if (!order) throw new NotFoundError("Order", orderId);
    if (order.userId !== userId) throw new ForbiddenError();
    if (order.status !== "pending" && order.status !== "processing") {
      throw new UnprocessableError(
        `Cannot cancel an order in status "${order.status}"`,
      );
    }
    return this.setStatus(orderId, userId, {
      status: "cancelled",
      noteKey: "cancelledByCustomer",
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
    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: "processing" },
      include: { user: true, plan: true, country: true },
    });

    if (this.sideEffects.onOrderProcessing) {
      void Promise.resolve(this.sideEffects.onOrderProcessing(updated)).catch(() => {
        /* hook owner logs */
      });
    }
    return updated;
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
