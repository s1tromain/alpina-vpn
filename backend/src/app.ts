import crypto from "node:crypto";
import Fastify, { type FastifyInstance } from "fastify";
import multipart from "@fastify/multipart";
import "./lib/json.js"; // installs BigInt.toJSON
import { env } from "./config/env.js";
import { loggerOptions } from "./lib/logger.js";
import { prismaPlugin } from "./plugins/prisma.plugin.js";
import { securityPlugin } from "./plugins/security.plugin.js";
import { authPlugin } from "./plugins/auth.plugin.js";
import { errorHandlerPlugin } from "./plugins/error-handler.plugin.js";
import { requestLoggingPlugin } from "./plugins/request-logging.plugin.js";
import { registerModules } from "./modules/index.js";
import { healthRoutes } from "./modules/health/health.routes.js";
import { startSubscriptionExpirySweep } from "./modules/subscriptions/subscriptions.cron.js";
import { telegramPlugin } from "./modules/telegram/telegram.plugin.js";

/**
 * Builds a Fastify instance with the full middleware/plugin stack. Exposed
 * as a function so tests can spin up isolated instances.
 *
 * Mount order matters:
 *   1. error handler   — must be first to catch plugin-level errors
 *   2. prisma          — every module depends on it
 *   3. request logging — onResponse hook emits status + duration
 *   4. security        — cors/helmet/ratelimit before route handlers see traffic
 *   5. auth            — decorators consumed by module preHandlers
 *   6. health          — un-prefixed, must be reachable even if /api is broken
 *   7. routes          — registered under /api
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: loggerOptions,
    trustProxy: true,
    disableRequestLogging: false,
    bodyLimit: 256 * 1024, // 256 KB — we never accept uploads, this is JSON only
    ajv: { customOptions: { removeAdditional: false, coerceTypes: false } },
    // Stable, monotonic request IDs surfaced in every log line and the
    // `x-request-id` response header. Honours an upstream-provided ID if
    // the reverse proxy already attached one.
    genReqId: (req) => {
      const fwd = req.headers["x-request-id"];
      if (typeof fwd === "string" && fwd.length > 0 && fwd.length <= 128) return fwd;
      return crypto.randomUUID();
    },
  });

  await app.register(errorHandlerPlugin);
  await app.register(prismaPlugin);
  await app.register(requestLoggingPlugin);
  await app.register(securityPlugin);
  await app.register(authPlugin);

  // Multipart only for the receipts upload route — body is buffered in
  // memory up to RECEIPTS_MAX_BYTES, then the service streams it to disk.
  await app.register(multipart, {
    limits: {
      fileSize: env.RECEIPTS_MAX_BYTES,
      files: 1,
      fields: 0,
      // Reject deeply nested multipart that could amplify into OOM.
      headerPairs: 200,
    },
    // Don't auto-attach files to req.body; we use the streaming `req.file()`
    // helper inside receipts.routes for explicit error handling.
    attachFieldsToBody: false,
  });

  await app.register(telegramPlugin);

  await app.register(healthRoutes);
  await registerModules(app, { prefix: "/api" });

  // Background sweep — expires subscriptions past `expiresAt` every 5 min.
  // Safe to run in every replica: `expireSubscription` is idempotent and
  // the sweep skips already-expired rows. Cleaned up via `onClose` hook.
  startSubscriptionExpirySweep(app);

  return app;
}
