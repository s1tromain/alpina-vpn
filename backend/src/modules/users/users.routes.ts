import type { FastifyPluginAsync } from "fastify";
import { UsersService } from "./users.service.js";
import { OrdersService } from "../orders/orders.service.js";
import { SubscriptionsService } from "../subscriptions/subscriptions.service.js";
import { toOrderDto, toSubscriptionDto, toUserDto } from "./users.mapper.js";

export const usersRoutes: FastifyPluginAsync = async (app) => {
  const users = new UsersService(app.prisma);
  const orders = new OrdersService(app.prisma);
  const subs = new SubscriptionsService(app.prisma);

  app.addHook("preHandler", app.authenticate);

  /** GET /users/me — current profile (includes current subscription). */
  app.get("/users/me", async (req) => {
    const profile = await users.getProfile(req.user!.id);
    return toUserDto(profile);
  });

  /** GET /users/me/orders — full purchase history. */
  app.get("/users/me/orders", async (req) => {
    const list = await orders.listForUser(req.user!.id);
    return list.map(toOrderDto);
  });

  /** GET /users/me/subscription — current active/paused subscription or null. */
  app.get("/users/me/subscription", async (req) => {
    const current = await subs.findCurrentForUser(req.user!.id);
    return current ? toSubscriptionDto(current) : null;
  });
};
