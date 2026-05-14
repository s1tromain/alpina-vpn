import type { FastifyPluginAsync } from "fastify";
import { env } from "../../config/env.js";
import { getVpnProvider } from "../vpn/index.js";

/**
 * Liveness + readiness endpoints, exposed UN-prefixed (no /api) and
 * unauthenticated so container orchestrators can hit them cheaply.
 *
 *   GET /health      — process is alive (no I/O)
 *   GET /health/db   — Prisma can SELECT 1 (used as readiness gate)
 *
 * Health checks deliberately skip the global rate limiter so a healthy
 * pod isn't marked unready under traffic spikes.
 */
const STARTED_AT = Date.now();

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/health",
    { config: { rateLimit: false } },
    async () => ({
      status: "ok",
      service: "alpinavpn-backend",
      env: env.NODE_ENV,
      uptimeSeconds: Math.floor((Date.now() - STARTED_AT) / 1000),
      timestamp: new Date().toISOString(),
    }),
  );

  app.get(
    "/health/db",
    { config: { rateLimit: false } },
    async (_req, reply) => {
      const startedAt = Date.now();
      try {
        await app.prisma.$queryRaw`SELECT 1`;
      } catch (err) {
        reply.code(503);
        return {
          status: "unhealthy",
          db: { ok: false, error: (err as Error).message },
          uptimeSeconds: Math.floor((Date.now() - STARTED_AT) / 1000),
          vpnProvider: getVpnProvider().name,
          timestamp: new Date().toISOString(),
        };
      }
      return {
        status: "ok",
        db: { ok: true, latencyMs: Date.now() - startedAt },
        uptimeSeconds: Math.floor((Date.now() - STARTED_AT) / 1000),
        vpnProvider: getVpnProvider().name,
        timestamp: new Date().toISOString(),
      };
    },
  );
};
