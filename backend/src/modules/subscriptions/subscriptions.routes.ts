import type { FastifyPluginAsync } from "fastify";
import { SubscriptionsService } from "./subscriptions.service.js";
import { toSubscriptionDto } from "../users/users.mapper.js";

/**
 * The frontend reads its current subscription via /users/me/subscription;
 * this module exposes the canonical aliased path as well.
 */
export const subscriptionsRoutes: FastifyPluginAsync = async (app) => {
  const subs = new SubscriptionsService(app.prisma);
  app.addHook("preHandler", app.authenticate);

  app.get("/subscriptions/me", async (req) => {
    const current = await subs.findCurrentForUser(req.user!.id);
    return current ? toSubscriptionDto(current) : null;
  });
};
