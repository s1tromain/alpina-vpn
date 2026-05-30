import type { FastifyInstance } from "fastify";
import type { OrdersSideEffects } from "./orders.service.js";

/**
 * Builds the side-effect bundle wired into `OrdersService`. Pulls the
 * `telegram` decorator (set up by `telegramPlugin`) so admin/operator and
 * user-facing routes both fire the same set of after-commit hooks.
 *
 * Every callback is wrapped in `try/catch` — losing a Telegram update must
 * never surface as a 500 to the API caller. The action has already
 * committed in the database.
 */
export function buildOrdersSideEffects(app: FastifyInstance): OrdersSideEffects {
  return {
    onOrderCreated: async (order) => {
      try {
        await app.telegram.moderation.postOrderCard(order);
        await app.telegram.notifier.orderReceivedDm(order.user.telegramId, order.id);
      } catch (err) {
        app.log.error({ err, orderId: order.id }, "orders_side_effect_create_failed");
      }
    },

    onOrderResolved: async (order, decision, subscription) => {
      try {
        // Telegram bot callback paths edit the card themselves (the bot
        // already knows the reviewer's display name). API/admin-panel
        // paths land here — `app.telegram.moderation.markResolved` is
        // idempotent so a double-edit is harmless.
        await app.telegram.moderation.markResolved(order, {
          status: decision.status,
          reviewerName: decision.reviewerName ?? "admin",
          ...(decision.reasonLabel ? { reasonLabel: decision.reasonLabel } : {}),
        });

        if (decision.status === "approved" && subscription) {
          await app.telegram.notifier.orderApprovedDm(order.user.telegramId, {
            orderId: order.id,
            subscriptionUrl: subscription.subscriptionUrl,
            expiresAt: subscription.expiresAt,
          });
        } else if (decision.status === "rejected") {
          await app.telegram.notifier.orderRejectedDm(order.user.telegramId, {
            orderId: order.id,
            ...(decision.reasonLabel ? { reasonLabel: decision.reasonLabel } : {}),
          });
        }
      } catch (err) {
        app.log.error({ err, orderId: order.id }, "orders_side_effect_resolved_failed");
      }
    },
  };
}
