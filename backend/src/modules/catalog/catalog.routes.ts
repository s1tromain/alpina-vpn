import type { FastifyPluginAsync } from "fastify";
import {
  toCountryDto,
  toPlanDto,
  toServerDto,
} from "../users/users.mapper.js";

/**
 * Catalogue endpoints used by the Mini App. PUBLIC — no auth required.
 *
 * Why public: the same data is rendered on the Mini App's landing screens
 * before the user has completed Telegram login. We still rate-limit at the
 * global level via the security plugin, so scrapers are bounded.
 *
 * NB: nothing here exposes user-private data; plans/countries/servers are
 * all admin-curated reference data.
 */
export const catalogRoutes: FastifyPluginAsync = async (app) => {
  /** GET /plans — active plans, ordered for display. */
  app.get("/plans", async () => {
    const plans = await app.prisma.plan.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    });
    return plans.map(toPlanDto);
  });

  /** GET /countries — active countries the user can select at checkout. */
  app.get("/countries", async () => {
    const countries = await app.prisma.country.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
    });
    return countries.map(toCountryDto);
  });

  /**
   * GET /vpn/servers — flat list of every VPN node we expose.
   * The frontend's "Servers" tab consumes this for the live status grid.
   * Each row carries country + flag + load + ping so a single fetch
   * powers the whole view.
   */
  app.get("/vpn/servers", async () => {
    const servers = await app.prisma.vpnServer.findMany({
      orderBy: [{ status: "asc" }, { ping: "asc" }],
      include: { country: true },
    });
    return servers.map(toServerDto);
  });
};
