import type { FastifyPluginAsync } from "fastify";
import { OrdersService } from "./orders.service.js";
import {
  createOrderSchema,
  orderIdParamsSchema,
} from "./orders.dto.js";
import { validateBody, validateParams } from "../../utils/zod.js";
import { toOrderDto } from "../users/users.mapper.js";

export const ordersRoutes: FastifyPluginAsync = async (app) => {
  const orders = new OrdersService(app.prisma);
  app.addHook("preHandler", app.authenticate);

  /** GET /orders — current user's purchase history (alias of /users/me/orders). */
  app.get("/orders", async (req) => {
    const list = await orders.listForUser(req.user!.id);
    return list.map(toOrderDto);
  });

  /** POST /orders — create a pending order for the current user. */
  app.post("/orders", async (req, reply) => {
    const dto = validateBody(req, createOrderSchema);
    const order = await orders.create(req.user!.id, dto);
    reply.code(201);
    return toOrderDto(order);
  });

  /** GET /orders/:id — fetch a single order (owner or staff). */
  app.get("/orders/:id", async (req) => {
    const { id } = validateParams(req, orderIdParamsSchema);
    const order = await orders.getById(id, req.user!.id, req.user!.role);
    return toOrderDto(order);
  });

  /** POST /orders/:id/paid — user marks they have paid; transitions pending → processing. */
  app.post("/orders/:id/paid", async (req) => {
    const { id } = validateParams(req, orderIdParamsSchema);
    const order = await orders.markPaidByUser(id, req.user!.id);
    return toOrderDto(order);
  });
};
