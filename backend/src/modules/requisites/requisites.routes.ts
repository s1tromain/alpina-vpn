import type { FastifyPluginAsync } from "fastify";
import { RequisitesService } from "./requisites.service.js";
import { toRequisiteDto } from "../users/users.mapper.js";

/**
 * Public-ish endpoint used during checkout — authenticated users only,
 * returns just the active payment requisites (no aggregate totals).
 */
export const paymentsRoutes: FastifyPluginAsync = async (app) => {
  const requisites = new RequisitesService(app.prisma);
  app.addHook("preHandler", app.authenticate);

  app.get("/payments/requisites", async () => {
    const list = await requisites.listActive();
    return list.map((r) => toRequisiteDto(r));
  });
};
