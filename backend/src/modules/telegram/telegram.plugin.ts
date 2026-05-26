import fp from "fastify-plugin";
import type { Update } from "node-telegram-bot-api";
import { env } from "../../config/env.js";
import { createTelegramBot, type TelegramBotHandle } from "./telegram-bot.js";
import { ModerationService } from "./moderation.service.js";
import { TelegramNotifier } from "./notifier.service.js";
import { CallbackDispatcher } from "./callback-dispatcher.js";

declare module "fastify" {
  interface FastifyInstance {
    telegram: {
      bot: TelegramBotHandle;
      moderation: ModerationService;
      notifier: TelegramNotifier;
    };
  }
}

/**
 * Boots the Telegram bot, attaches the callback dispatcher, exposes the
 * moderation + notifier services on the Fastify instance, and (in webhook
 * mode) registers the public webhook endpoint.
 *
 * Webhook endpoint:
 *   POST /api/telegram/webhook/:secret
 *     - secret is matched against TELEGRAM_WEBHOOK_SECRET (path) AND verified
 *       via X-Telegram-Bot-Api-Secret-Token (header) — Telegram sends both.
 *     - 401 on mismatch; rate-limit plugin still applies on top.
 *
 * Bot is closed on Fastify `onClose` so polling stops cleanly during deploys.
 */
export const telegramPlugin = fp(async (app) => {
  const bot = await createTelegramBot(app.log);

  const moderation = new ModerationService(app.prisma, bot, app.log);
  const notifier = new TelegramNotifier(bot, app.log);

  const dispatcher = new CallbackDispatcher(app.prisma, bot, moderation, notifier, app.log);
  dispatcher.attach();

  app.decorate("telegram", { bot, moderation, notifier });

  if (bot.mode === "webhook" && env.TELEGRAM_WEBHOOK_SECRET) {
    const secret = env.TELEGRAM_WEBHOOK_SECRET;
    app.post<{ Params: { secret: string }; Body: Update }>(
      "/api/telegram/webhook/:secret",
      {
        // Webhook bodies can carry inline photos forwarded as base64 — keep
        // the limit generous but not unbounded. Telegram says <=1MB.
        bodyLimit: 1024 * 1024,
      },
      async (req, reply) => {
        const pathMatch = req.params.secret === secret;
        const headerSecret = req.headers["x-telegram-bot-api-secret-token"];
        const headerMatch =
          typeof headerSecret === "string" && headerSecret === secret;

        if (!pathMatch || !headerMatch) {
          app.log.warn(
            {
              ip: req.ip,
              pathMatch,
              headerMatch,
            },
            "telegram_webhook_auth_failed",
          );
          reply.code(401);
          return { ok: false };
        }

        try {
          bot.processUpdate(req.body);
        } catch (err) {
          // Never 500 to Telegram — it'll back off and retry forever, which
          // turns a transient bug into a flood. Log and 200.
          app.log.error({ err }, "telegram_webhook_processUpdate_failed");
        }
        return { ok: true };
      },
    );
  }

  app.addHook("onClose", async () => {
    await bot.close();
  });
});
