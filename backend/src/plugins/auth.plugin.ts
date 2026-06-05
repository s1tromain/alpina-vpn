import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import fastifyCookie from "@fastify/cookie";
import type { UserRole } from "@prisma/client";
import { env } from "../config/env.js";
import { ForbiddenError, UnauthorizedError } from "../lib/errors.js";
import { verifyTelegramInitData } from "../modules/auth/telegram-verifier.js";
import { ADMIN_SESSION_COOKIE } from "../modules/auth/admin-session.js";

/**
 * Registers JWT support, plus two decorators used as preHandlers on routes:
 *
 *   - app.authenticate              → loads `req.user` from JWT or initData
 *   - app.requireRole(...roles)     → guard chained after `authenticate`
 *
 * Auth precedence per request:
 *   1. `Authorization: Bearer <jwt>`          (preferred, fast path)
 *   2. `<ADMIN_SESSION_COOKIE>` HttpOnly JWT   (web admin panel — browser, no Telegram)
 *   3. `X-Telegram-Init-Data: <raw initData>` (also accepted — Mini App frontend uses this)
 *   4. `X-Dev-Telegram-Id: <id>`              (dev only, gated by ALLOW_DEV_AUTH)
 */
export const authPlugin = fp(async (app) => {
  // Cookie parsing must be registered before we read req.cookies / set
  // cookies on the reply (admin login handler).
  await app.register(fastifyCookie);

  await app.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_ACCESS_TTL },
  });

  app.decorate("authenticate", async (req, _reply) => {
    // 1) JWT
    const authz = req.headers.authorization;
    if (authz && authz.startsWith("Bearer ")) {
      try {
        const payload = await req.jwtVerify<{ sub: string; tg: string; role: UserRole }>();
        const user = await app.prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user || user.bannedAt) throw new UnauthorizedError("Account is not active");
        req.user = { id: user.id, telegramId: user.telegramId.toString(), role: user.role };
        return;
      } catch (err) {
        if (err instanceof UnauthorizedError) throw err;
        throw new UnauthorizedError("Invalid token");
      }
    }

    // 2) HttpOnly session cookie (web admin panel). The cookie carries the
    //    same JWT we issue for Bearer auth — just delivered out of reach of
    //    client-side JS so an XSS can't exfiltrate it.
    const cookieToken = req.cookies?.[ADMIN_SESSION_COOKIE];
    if (typeof cookieToken === "string" && cookieToken.length > 0) {
      try {
        const payload = app.jwt.verify<{ sub: string; tg: string; role: UserRole }>(
          cookieToken,
        );
        const user = await app.prisma.user.findUnique({ where: { id: payload.sub } });
        if (!user || user.bannedAt) throw new UnauthorizedError("Account is not active");
        req.user = { id: user.id, telegramId: user.telegramId.toString(), role: user.role };
        return;
      } catch (err) {
        if (err instanceof UnauthorizedError) throw err;
        throw new UnauthorizedError("Invalid session");
      }
    }

    // 3) Telegram initData (the existing Mini App frontend uses this header).
    const initData = req.headers["x-telegram-init-data"];
    if (typeof initData === "string" && initData.length > 0) {
      const verified = verifyTelegramInitData(initData, {
        botToken: env.TELEGRAM_BOT_TOKEN,
        maxAgeSeconds: env.TELEGRAM_AUTH_TTL_SECONDS,
      });
      const user = await app.prisma.user.findUnique({
        where: { telegramId: BigInt(verified.user.id) },
      });
      if (!user) throw new UnauthorizedError("Unknown user — call /auth/telegram first");
      if (user.bannedAt) throw new UnauthorizedError("Account is not active");
      req.user = { id: user.id, telegramId: user.telegramId.toString(), role: user.role };
      return;
    }

    // 4) Dev-only bypass — never enabled in prod (env validator enforces).
    if (env.ALLOW_DEV_AUTH) {
      const devId = req.headers["x-dev-telegram-id"];
      if (typeof devId === "string" && devId.length > 0) {
        const user = await app.prisma.user.findUnique({
          where: { telegramId: BigInt(devId) },
        });
        if (user) {
          req.user = { id: user.id, telegramId: user.telegramId.toString(), role: user.role };
          return;
        }
      }
    }

    throw new UnauthorizedError("Missing credentials");
  });

  app.decorate("requireRole", (...roles: UserRole[]) => {
    return async (req) => {
      if (!req.user) throw new UnauthorizedError();
      if (!roles.includes(req.user.role)) throw new ForbiddenError();
    };
  });
});
