import type { FastifyPluginAsync } from "fastify";
import { AuthService } from "./auth.service.js";
import { adminLoginSchema, telegramLoginSchema } from "./auth.dto.js";
import { validateBody } from "../../utils/zod.js";
import { toUserDto } from "../users/users.mapper.js";
import { UsersService } from "../users/users.service.js";
import { verifyPassword } from "../../lib/password.js";
import { UnauthorizedError } from "../../lib/errors.js";
import {
  ADMIN_SESSION_COOKIE,
  adminCookieOptions,
} from "./admin-session.js";

export const authRoutes: FastifyPluginAsync = async (app) => {
  const auth = new AuthService(app.prisma);
  const users = new UsersService(app.prisma);

  /**
   * POST /auth/telegram
   * Body: { initData: string }
   * Returns: { token, user }
   *
   * Verifies the Mini App initData HMAC, upserts the user, and issues a JWT
   * the client can use on subsequent requests (Authorization: Bearer …).
   */
  app.post(
    "/auth/telegram",
    {
      // Tighter per-route limit on login: a single client should only ever
      // call this on Mini App boot. Anything higher is replay/abuse — the
      // initData HMAC is forge-proof but rejected hashes are still CPU work.
      config: {
        rateLimit: { max: 20, timeWindow: "1 minute" },
      },
    },
    async (req) => {
      const { initData } = validateBody(req, telegramLoginSchema);
      const { user, isNewUser } = await auth.loginWithTelegram(initData);

      const token = app.jwt.sign({
        sub: user.id,
        tg: user.telegramId.toString(),
        role: user.role,
      });

      const hydrated = await users.getProfile(user.id);
      return { token, isNewUser, user: toUserDto(hydrated) };
    },
  );

  /**
   * POST /auth/admin/login
   * Body: { username, password }
   *
   * Web admin panel login (browser, outside Telegram). Verifies the password
   * for an operator/admin account, then issues the same JWT we use elsewhere
   * — delivered as an HttpOnly cookie so the SPA never has to handle the raw
   * token. Returns the user DTO so the client can render immediately.
   *
   * Errors are deliberately generic ("Invalid credentials") to avoid leaking
   * which usernames exist or which accounts have a password set.
   */
  app.post(
    "/auth/admin/login",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
    },
    async (req, reply) => {
      const { username, password } = validateBody(req, adminLoginSchema);

      const user = await app.prisma.user.findFirst({
        where: {
          username,
          passwordHash: { not: null },
          role: { in: ["admin", "operator"] },
        },
      });

      const ok =
        user && (await verifyPassword(password, user.passwordHash));
      if (!user || !ok) {
        throw new UnauthorizedError("Invalid credentials");
      }
      if (user.bannedAt) {
        throw new UnauthorizedError("Account is not active");
      }

      const token = app.jwt.sign({
        sub: user.id,
        tg: user.telegramId.toString(),
        role: user.role,
      });

      reply.setCookie(ADMIN_SESSION_COOKIE, token, adminCookieOptions());

      await app.prisma.user.update({
        where: { id: user.id },
        data: { lastSeenAt: new Date() },
      });

      const hydrated = await users.getProfile(user.id);
      return { user: toUserDto(hydrated) };
    },
  );

  /**
   * POST /auth/admin/logout — clears the session cookie. No auth required;
   * a stale/absent cookie just no-ops.
   */
  app.post("/auth/admin/logout", async (_req, reply) => {
    reply.clearCookie(ADMIN_SESSION_COOKIE, { path: "/" });
    return { ok: true };
  });

  /**
   * GET /auth/admin/me — current admin/operator session (cookie or Bearer).
   * Used by the panel to bootstrap and to gate the UI by role.
   */
  app.get(
    "/auth/admin/me",
    { preHandler: [app.authenticate, app.requireRole("admin", "operator")] },
    async (req) => {
      const profile = await users.getProfile(req.user!.id);
      return toUserDto(profile);
    },
  );

  /**
   * GET /auth/me
   * Returns the current authenticated user (same shape as GET /users/me).
   * Accepts either JWT or X-Telegram-Init-Data.
   */
  app.get("/auth/me", { preHandler: app.authenticate }, async (req) => {
    const profile = await users.getProfile(req.user!.id);
    return toUserDto(profile);
  });
};
