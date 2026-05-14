import type { FastifyPluginAsync } from "fastify";
import { AuthService } from "./auth.service.js";
import { telegramLoginSchema } from "./auth.dto.js";
import { validateBody } from "../../utils/zod.js";
import { toUserDto } from "../users/users.mapper.js";
import { UsersService } from "../users/users.service.js";

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
   * GET /auth/me
   * Returns the current authenticated user (same shape as GET /users/me).
   * Accepts either JWT or X-Telegram-Init-Data.
   */
  app.get("/auth/me", { preHandler: app.authenticate }, async (req) => {
    const profile = await users.getProfile(req.user!.id);
    return toUserDto(profile);
  });
};
