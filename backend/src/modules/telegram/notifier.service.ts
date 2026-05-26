import type { BotLogger, TelegramBotHandle } from "./telegram-bot.js";
import { env } from "../../config/env.js";

/**
 * One-way DMs to users. Used by the orders flow to confirm receipt of a
 * payment, approval, rejection. We deliberately do NOT raise on send
 * failure — Telegram delivery is best-effort and the user always has the
 * Mini App notifications panel as a source of truth.
 *
 * All messages are short, single-language for now (RU); when i18n lands
 * pass the language code from `User.languageCode` and key the body off
 * the `NotificationKind` translation key.
 */
export class TelegramNotifier {
  constructor(
    private readonly bot: TelegramBotHandle,
    private readonly logger: BotLogger,
  ) {}

  async orderReceivedDm(telegramId: bigint | string, orderId: string): Promise<void> {
    await this.dm(
      telegramId,
      `🟡 Ваш заказ <code>${orderId}</code> зарегистрирован и ожидает оплаты.\n` +
        `После загрузки чека модерация займёт до 15 минут.`,
    );
  }

  async receiptReceivedDm(telegramId: bigint | string, orderId: string): Promise<void> {
    await this.dm(
      telegramId,
      `🟠 Чек по заказу <code>${orderId}</code> получен и отправлен на модерацию.\n` +
        `Вы получите уведомление, как только заказ будет обработан.`,
    );
  }

  async orderApprovedDm(
    telegramId: bigint | string,
    args: { orderId: string; subscriptionUrl: string; expiresAt: Date },
  ): Promise<void> {
    const expiresAt = args.expiresAt.toISOString().slice(0, 10);
    await this.dm(
      telegramId,
      `✅ Оплата по заказу <code>${args.orderId}</code> подтверждена.\n` +
        `VPN активен до <b>${expiresAt}</b>.\n\n` +
        `Откройте приложение, чтобы добавить подписку на устройство:`,
      this.openAppButton(),
    );
  }

  async orderRejectedDm(
    telegramId: bigint | string,
    args: { orderId: string; reasonLabel?: string },
  ): Promise<void> {
    const reason = args.reasonLabel ? `\nПричина: ${args.reasonLabel}` : "";
    await this.dm(
      telegramId,
      `❌ Заказ <code>${args.orderId}</code> отклонён.${reason}\n\n` +
        `Если это ошибка — напишите в поддержку.`,
      this.openAppButton(),
    );
  }

  async subscriptionExpiringDm(
    telegramId: bigint | string,
    args: { daysLeft: number; expiresAt: Date },
  ): Promise<void> {
    const expiresAt = args.expiresAt.toISOString().slice(0, 10);
    const dayWord = args.daysLeft === 1 ? "день" : args.daysLeft < 5 ? "дня" : "дней";
    await this.dm(
      telegramId,
      `⏳ Ваша подписка истекает через <b>${args.daysLeft} ${dayWord}</b> ` +
        `(<b>${expiresAt}</b>).\n` +
        `Продлите её сейчас, чтобы не потерять доступ к VPN.`,
      this.openAppButton(),
    );
  }

  async subscriptionExpiredDm(
    telegramId: bigint | string,
  ): Promise<void> {
    await this.dm(
      telegramId,
      `⌛ Ваша VPN-подписка истекла. Чтобы продолжить пользоваться сервисом, ` +
        `оформите новый заказ в приложении.`,
      this.openAppButton(),
    );
  }

  private openAppButton() {
    if (!env.TELEGRAM_BOT_USERNAME) return undefined;
    // Telegram WebApp buttons are not allowed in non-WebApp chats *and* the
    // `web_app` button type only works in private chats with the bot. For
    // notifications to users this is exactly what we have, so it's safe.
    return {
      inline_keyboard: [
        [
          {
            text: "📱 Открыть приложение",
            url: env.MINI_APP_URL,
          },
        ],
      ],
    };
  }

  private async dm(
    telegramId: bigint | string,
    text: string,
    replyMarkup?: { inline_keyboard: { text: string; url: string }[][] },
  ): Promise<void> {
    if (!this.bot.isLive) return;
    try {
      await this.bot.sendMessage(String(telegramId), text, {
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      });
    } catch (err) {
      // Most common cause: user blocked the bot or never `/start`ed it.
      // Log at warn — not an actionable error, but worth surfacing.
      this.logger.warn({ err, telegramId: String(telegramId) }, "telegram_dm_failed");
    }
  }
}
