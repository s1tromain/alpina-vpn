import { PrismaClient } from "@prisma/client";
import { env, isProd } from "../config/env.js";

/**
 * Single PrismaClient instance per process. We re-use the same instance
 * across hot reloads in dev via a globalThis cache so we don't exhaust the
 * Postgres connection pool.
 */
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  globalThis.__prisma ??
  new PrismaClient({
    log: isProd ? ["error", "warn"] : ["error", "warn"],
    datasources: { db: { url: env.DATABASE_URL } },
  });

if (!isProd) globalThis.__prisma = prisma;
