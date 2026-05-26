import type { CallbackQuery, Message } from "node-telegram-bot-api";
import type { PrismaClient } from "@prisma/client";
import { OrdersService } from "../orders/orders.service.js";
import { ModerationService } from "./moderation.service.js";
import { TelegramNotifier } from "./notifier.service.js";
import { parseCallback, REJECT_REASONS } from "./callback-data.js";
import type { BotLogger, TelegramBotHandle } from "./telegram-bot.js";
import { env } from "../../config/env.js";
import { AppError } from "../../lib/errors.js";

/**
 * Wires the bot's incoming events to domain services.
 *
 *   /start              → DMs the user a brief intro + Mini App button
 *   callback_query      → routed by `parseCallback`:
 *      approve         → OrdersService.setStatus("approved") + edit card + DM user
 *      reject-prompt   → replace keyboard with reason picker
 *      reject-confirm  → OrdersService.setStatus("rejected") + edit card + DM user
 *
 * Authorisation: any callback_query is checked against the `users` table to
 * make sure the actor has role `admin` or `operator`. Random members of the
 * moderation channel can't unilaterally approve a payment.
 */
export class CallbackDispatcher {
  private readonly orders: OrdersService;

  constructor(
    private readonly prisma: PrismaClient,
    private readonly bot: TelegramBotHandle,
    private readonly moderation: ModerationService,
    private readonly notifier: TelegramNotifier,
    private readonly logger: BotLogger,
  ) {
    this.orders = new OrdersService(prisma);
  }

  /** Register `on(...)` handlers. Safe to call multiple times (each is additive). */
  attach(): void {
    if (!this.bot.isLive) return;
    this.bot.on("message", (m) => void this.handleMessage(m).catch((err) =>
      this.logger.error({ err }, "telegram_message_handler_failed"),
    ));
    this.bot.on("callback_query", (q) => void this.handleCallbackQuery(q).catch((err) =>
      this.logger.error({ err }, "telegram_callback_handler_failed"),
    ));
  }

  private async handleMessage(msg: Message): Promise<void> {
    const text = msg.text?.trim();
    if (!text) return;
    if (!msg.from || msg.from.is_bot) return;

    if (text === "/start" || text.startsWith("/start ")) {
      const greeting =
        `👋 Добро пожаловать в <b>Alpina VPN</b>!\n\n` +
        `Выберите тариф, оплатите и получите безлимитный доступ к серверам в один клик.`;
      const replyMarkup = env.MINI_APP_URL
        ? {
            inline_keyboard: [
              [{ text: "📱 Открыть приложение", url: env.MINI_APP_URL }],
            ],
          }
        : undefined;
      await this.bot.sendMessage(msg.chat.id, greeting, {
        parse_mode: "HTML",
        ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
      });
      return;
    }

    if (text === "/help") {
      await this.bot.sendMessage(
        msg.chat.id,
        `Команды:\n/start — открыть приложение\n/help — это сообщение`,
      );
    }
  }

  private async handleCallbackQuery(query: CallbackQuery): Promise<void> {
    const parsed = parseCallback(query.data);

    if (parsed.kind === "noop" || parsed.kind === "unknown") {
      await this.bot.answerCallbackQuery(query.id);
      return;
    }

    // Authorise: the actor must be a registered admin/operator.
    const actor = await this.requireStaff(query);
    if (!actor) return;

    if (parsed.kind === "reject-prompt") {
      const order = await this.loadOrder(parsed.orderId);
      if (!order) {
        await this.bot.answerCallbackQuery(query.id, {
          text: "Заказ не найден",
          show_alert: true,
        });
        return;
      }
      await this.moderation.promptRejectReason(order);
      await this.bot.answerCallbackQuery(query.id, { text: "Выберите причину" });
      return;
    }

    if (parsed.kind === "approve") {
      await this.applyDecision(query, actor, parsed.orderId, "approved");
      return;
    }

    if (parsed.kind === "reject-confirm") {
      const reason = REJECT_REASONS[parsed.reason];
      await this.applyDecision(query, actor, parsed.orderId, "rejected", reason);
      return;
    }
  }

  private async applyDecision(
    query: CallbackQuery,
    actor: { id: string; displayName: string },
    orderId: string,
    status: "approved" | "rejected",
    reason?: { noteKey: "paymentNotReceived" | undefined; label: string },
  ): Promise<void> {
    try {
      await this.orders.setStatus(orderId, actor.id, {
        status,
        ...(reason?.noteKey ? { noteKey: reason.noteKey } : {}),
        ...(reason?.label ? { note: reason.label } : {}),
      });

      // Post-commit side effects: edit moderation card + DM user.
      // Re-fetch the order to pick up updated columns + relations.
      const refreshed = await this.loadOrder(orderId);
      if (refreshed) {
        await this.moderation.markResolved(refreshed, {
          status,
          reviewerName: actor.displayName,
          reasonLabel: reason?.label,
        });

        if (status === "approved") {
          const sub = await this.prisma.subscription.findUnique({
            where: { orderId },
          });
          if (sub) {
            await this.notifier.orderApprovedDm(refreshed.user.telegramId, {
              orderId,
              subscriptionUrl: sub.subscriptionUrl,
              expiresAt: sub.expiresAt,
            });
          }
        } else {
          await this.notifier.orderRejectedDm(refreshed.user.telegramId, {
            orderId,
            reasonLabel: reason?.label,
          });
        }
      }

      await this.bot.answerCallbackQuery(query.id, {
        text: status === "approved" ? "✅ Одобрено" : "❌ Отклонено",
      });
    } catch (err) {
      const msg =
        err instanceof AppError ? err.message : "Не удалось обновить заказ";
      this.logger.error({ err, orderId, status }, "telegram_callback_decision_failed");
      await this.bot.answerCallbackQuery(query.id, { text: msg, show_alert: true });
    }
  }

  private async loadOrder(orderId: string) {
    return this.prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true, plan: true, country: true },
    });
  }

  private async requireStaff(
    query: CallbackQuery,
  ): Promise<{ id: string; displayName: string } | null> {
    if (!query.from) {
      await this.bot.answerCallbackQuery(query.id, {
        text: "Не удалось определить отправителя",
        show_alert: true,
      });
      return null;
    }
    const user = await this.prisma.user.findUnique({
      where: { telegramId: BigInt(query.from.id) },
    });
    if (!user || (user.role !== "admin" && user.role !== "operator")) {
      await this.bot.answerCallbackQuery(query.id, {
        text: "Только администраторы могут модерировать заказы",
        show_alert: true,
      });
      return null;
    }
    if (user.bannedAt) {
      await this.bot.answerCallbackQuery(query.id, {
        text: "Аккаунт заблокирован",
        show_alert: true,
      });
      return null;
    }
    const displayName = user.username ? `@${user.username}` : user.firstName;
    return { id: user.id, displayName };
  }
}
