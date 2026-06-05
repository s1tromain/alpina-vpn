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

  app.get("/payments/requisites", async (req) => {
    const list = await requisites.listActive();
    // Diagnostic: an empty list is the silent root cause of "purchase does
    // nothing" — the Mini App can't start checkout without an active card.
    if (list.length === 0) {
      req.log.error(
        "checkout_no_active_requisite: GET /payments/requisites returned 0 active cards — users cannot purchase. Add one via /admin/requisites or run `npm run db:seed`.",
      );
    } else {
      req.log.info(
        { activeRequisites: list.length },
        "checkout_requisites_served",
      );
    }
    return list.map((r) => toRequisiteDto(r));
  });
};
