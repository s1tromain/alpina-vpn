import type { PrismaClient, User } from "@prisma/client";
import { env } from "../../config/env.js";
import { verifyTelegramInitData } from "./telegram-verifier.js";

export interface LoginResult {
  user: User;
  /** True if this call created the user record (first-ever login). */
  isNewUser: boolean;
}

export class AuthService {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Verifies initData, upserts the user, bumps `lastSeenAt`, and bootstraps
   * admin role for telegram IDs listed in BOOTSTRAP_ADMIN_TELEGRAM_IDS.
   */
  async loginWithTelegram(initData: string): Promise<LoginResult> {
    const verified = verifyTelegramInitData(initData, {
      botToken: env.TELEGRAM_BOT_TOKEN,
      maxAgeSeconds: env.TELEGRAM_AUTH_TTL_SECONDS,
    });

    const telegramId = BigInt(verified.user.id);
    const isBootstrapAdmin = env.BOOTSTRAP_ADMIN_TELEGRAM_IDS.some(
      (id) => id === telegramId,
    );

    const existing = await this.prisma.user.findUnique({ where: { telegramId } });

    if (!existing) {
      const created = await this.prisma.user.create({
        data: {
          telegramId,
          username: verified.user.username ?? null,
          firstName: verified.user.first_name,
          lastName: verified.user.last_name ?? null,
          photoUrl: verified.user.photo_url ?? null,
          languageCode: verified.user.language_code ?? null,
          isPremium: verified.user.is_premium ?? false,
          role: isBootstrapAdmin ? "admin" : "user",
          lastSeenAt: new Date(),
        },
      });
      return { user: created, isNewUser: true };
    }

    // Keep profile fields fresh, but never downgrade an admin/operator role.
    const updated = await this.prisma.user.update({
      where: { telegramId },
      data: {
        username: verified.user.username ?? existing.username,
        firstName: verified.user.first_name,
        lastName: verified.user.last_name ?? existing.lastName,
        photoUrl: verified.user.photo_url ?? existing.photoUrl,
        languageCode: verified.user.language_code ?? existing.languageCode,
        isPremium: verified.user.is_premium ?? existing.isPremium,
        role:
          existing.role === "user" && isBootstrapAdmin ? "admin" : existing.role,
        lastSeenAt: new Date(),
      },
    });

    return { user: updated, isNewUser: false };
  }
}
