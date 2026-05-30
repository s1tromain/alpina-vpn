import type { FastifyPluginAsync } from "fastify";
import { AdminService } from "./admin.service.js";
import { OrdersService } from "../orders/orders.service.js";
import { buildOrdersSideEffects } from "../orders/orders.side-effects.js";
import { UsersService } from "../users/users.service.js";
import { RequisitesService } from "../requisites/requisites.service.js";
import { PlansService } from "../plans/plans.service.js";
import {
  createPlanSchema,
  planIdSchema,
  updatePlanSchema,
} from "../plans/plans.dto.js";
import {
  listOrdersQuerySchema,
  orderIdParamsSchema,
  updateOrderStatusSchema,
} from "../orders/orders.dto.js";
import {
  adminListUsersQuerySchema,
  setUserRoleSchema,
  userIdParamsSchema,
} from "./admin.dto.js";
import {
  createRequisiteSchema,
  requisiteIdSchema,
  updateRequisiteSchema,
} from "../requisites/requisites.dto.js";
import {
  validateBody,
  validateParams,
  validateQuery,
} from "../../utils/zod.js";
import {
  toOrderDto,
  toPlanDto,
  toRequisiteDto,
  toUserDto,
} from "../users/users.mapper.js";

/**
 * Mounted at /admin. ALL routes require an admin or operator role.
 * Routes that mutate global state additionally require admin.
 */
export const adminRoutes: FastifyPluginAsync = async (app) => {
  const admin = new AdminService(app.prisma);
  const orders = new OrdersService(app.prisma, buildOrdersSideEffects(app));
  const users = new UsersService(app.prisma);
  const requisites = new RequisitesService(app.prisma);
  const plans = new PlansService(app.prisma);

  app.addHook("preHandler", app.authenticate);
  app.addHook("preHandler", app.requireRole("admin", "operator"));

  app.get("/admin/stats", async () => admin.stats());

  // ── Orders ──────────────────────────────────────────────────────────────
  app.get("/admin/orders", async (req) => {
    const q = validateQuery(req, listOrdersQuerySchema);
    const list = await orders.listForAdmin(q);
    return list.map(toOrderDto);
  });

  app.patch("/admin/orders/:id", async (req) => {
    const { id } = validateParams(req, orderIdParamsSchema);
    const dto = validateBody(req, updateOrderStatusSchema);
    const updated = await orders.setStatus(id, req.user!.id, dto);
    return toOrderDto(updated);
  });

  // ── Users ───────────────────────────────────────────────────────────────
  app.get("/admin/users", async (req) => {
    const q = validateQuery(req, adminListUsersQuerySchema);
    const list = await users.listForAdmin(q);
    return list.map(toUserDto);
  });

  app.patch(
    "/admin/users/:id/role",
    { preHandler: app.requireRole("admin") },
    async (req) => {
      const { id } = validateParams(req, userIdParamsSchema);
      const { role } = validateBody(req, setUserRoleSchema);
      const updated = await admin.setUserRole(req.user!.id, id, role);
      return { id: updated.id, role: updated.role };
    },
  );

  // ── Plans ───────────────────────────────────────────────────────────────
  app.get("/admin/plans", async () => {
    const list = await plans.listAll();
    return list.map(toPlanDto);
  });

  app.post(
    "/admin/plans",
    { preHandler: app.requireRole("admin") },
    async (req, reply) => {
      const dto = validateBody(req, createPlanSchema);
      const created = await plans.create(dto);
      reply.code(201);
      return toPlanDto(created);
    },
  );

  app.patch(
    "/admin/plans/:id",
    { preHandler: app.requireRole("admin") },
    async (req) => {
      const { id } = validateParams(req, planIdSchema);
      const dto = validateBody(req, updatePlanSchema);
      const updated = await plans.update(id, dto);
      return toPlanDto(updated);
    },
  );

  // ── Payment requisites ──────────────────────────────────────────────────
  app.get("/admin/requisites", async () => {
    const list = await requisites.listAll();
    return list.map((r) => toRequisiteDto(r, { includeTotals: true }));
  });

  app.post(
    "/admin/requisites",
    { preHandler: app.requireRole("admin") },
    async (req, reply) => {
      const dto = validateBody(req, createRequisiteSchema);
      const created = await requisites.create(dto);
      reply.code(201);
      return toRequisiteDto(created, { includeTotals: true });
    },
  );

  /**
   * PATCH /admin/requisites/:id — partial update including the activate /
   * deactivate toggle. Body example: `{ "active": false }`.
   */
  app.patch(
    "/admin/requisites/:id",
    { preHandler: app.requireRole("admin") },
    async (req) => {
      const { id } = validateParams(req, requisiteIdSchema);
      const dto = validateBody(req, updateRequisiteSchema);
      const updated = await requisites.update(id, dto, req.user!.id);
      return toRequisiteDto(updated, { includeTotals: true });
    },
  );

  app.delete(
    "/admin/requisites/:id",
    { preHandler: app.requireRole("admin") },
    async (req, reply) => {
      const { id } = validateParams(req, requisiteIdSchema);
      await requisites.remove(id, req.user!.id);
      reply.code(204);
    },
  );
};
