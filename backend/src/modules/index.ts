import type { FastifyInstance } from "fastify";
import { authRoutes } from "./auth/auth.routes.js";
import { usersRoutes } from "./users/users.routes.js";
import { ordersRoutes } from "./orders/orders.routes.js";
import { subscriptionsRoutes } from "./subscriptions/subscriptions.routes.js";
import { paymentsRoutes } from "./requisites/requisites.routes.js";
import { catalogRoutes } from "./catalog/catalog.routes.js";
import { notificationsRoutes } from "./notifications/notifications.routes.js";
import { adminRoutes } from "./admin/admin.routes.js";
import { adminReceiptsRoutes, receiptsRoutes } from "./receipts/receipts.routes.js";

/**
 * Registers all feature modules under the supplied prefix. Each module
 * keeps its own preHandlers — we only do composition here.
 */
export async function registerModules(app: FastifyInstance, opts: { prefix: string }) {
  await app.register(
    async (scoped) => {
      await scoped.register(authRoutes);
      await scoped.register(usersRoutes);
      await scoped.register(ordersRoutes);
      await scoped.register(receiptsRoutes);
      await scoped.register(subscriptionsRoutes);
      await scoped.register(paymentsRoutes);
      await scoped.register(catalogRoutes);
      await scoped.register(notificationsRoutes);
      await scoped.register(adminRoutes);
      await scoped.register(adminReceiptsRoutes);
    },
    { prefix: opts.prefix },
  );
}
