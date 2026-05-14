import type { FastifyServerOptions } from "fastify";
import { env, isProd } from "../config/env.js";

/**
 * Pino options shared by Fastify and any standalone scripts.
 *
 * Explicitly typed as `FastifyServerOptions["logger"]` so the resulting
 * value pins Fastify's overload resolver to the http/1 server type —
 * leaving this loose forces TS to fall through to the http2-secure
 * overload, which then poisons every later `app.register(...)` call.
 *
 * No `as const`: Pino's `redact.paths` must be a mutable `string[]`.
 */
export const loggerOptions: FastifyServerOptions["logger"] = {
  level: env.LOG_LEVEL,
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers['x-telegram-init-data']",
      "req.headers.cookie",
      "*.token",
      "*.password",
    ],
    censor: "[REDACTED]",
  },
  ...(isProd
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss.l", ignore: "pid,hostname" },
        },
      }),
};
