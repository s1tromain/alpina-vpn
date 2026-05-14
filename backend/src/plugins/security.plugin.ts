import fp from "fastify-plugin";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import { env, isProd } from "../config/env.js";

/**
 * Cross-cutting security middleware. Registered as a single bundle so
 * tests can spin up the app without re-declaring each piece.
 *
 *  - sensible:    `httpErrors` helpers + reasonable defaults
 *  - helmet:      basic security headers (CSP off because we ship JSON only)
 *  - cors:        explicit allowlist; refuses '*' in production
 *  - rate-limit:  global per-IP cap (auth route overrides with stricter limit)
 */
export const securityPlugin = fp(async (app) => {
  await app.register(sensible);

  await app.register(helmet, {
    // We never serve HTML from this service, so CSP would only fire on
    // accidental error pages — keep it off to avoid confusing developers.
    contentSecurityPolicy: false,
    // Mini Apps render this backend's responses inside a Telegram WebView;
    // COEP would break that.
    crossOriginEmbedderPolicy: false,
    // Strict referrer in prod, lax in dev so it's debuggable.
    referrerPolicy: { policy: isProd ? "no-referrer" : "strict-origin-when-cross-origin" },
    // X-Frame-Options DENY: this API has no UI to embed.
    frameguard: { action: "deny" },
  });

  const origins = env.CORS_ORIGINS.split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  if (isProd && origins.includes("*")) {
    // We refuse to boot in this state — '*' + credentials is impossible
    // anyway (browsers reject it) and signals a misconfigured deploy.
    app.log.error("CORS_ORIGINS='*' is not allowed in production");
    throw new Error("CORS_ORIGINS='*' is not allowed in production");
  }
  if (origins.length === 0) {
    app.log.warn("CORS_ORIGINS is empty — all browser requests will be blocked");
  }

  await app.register(cors, {
    origin: origins.includes("*") ? true : origins,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Telegram-Init-Data",
      "X-Dev-Telegram-Id",
      "X-Request-Id",
    ],
    exposedHeaders: ["X-Request-Id"],
    maxAge: 600,
  });

  await app.register(rateLimit, {
    global: true,
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW,
    // Rate-limit fires as an onRequest hook — earlier than our `authenticate`
    // preHandler — so `req.user` is not yet populated. Keying by IP only is
    // intentional. A shared IP (carrier NAT) will share the bucket; the
    // global ceiling is generous enough that this is acceptable for MVP.
    keyGenerator: (req) => req.ip,
    // The plugin's default 429 body is replaced here so every error
    // response across the service shares the same { error, message } shape.
    errorResponseBuilder: (_req, ctx) => ({
      error: "RATE_LIMITED",
      message: `Too many requests — retry in ${Math.ceil(ctx.ttl / 1000)}s`,
    }),
  });
});
