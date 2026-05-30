import fs from "node:fs/promises";
import path from "node:path";
import type { Order, Plan, Country, User, PrismaClient, Receipt } from "@prisma/client";
import { env } from "../../config/env.js";
import {
  encodeApprove,
  encodeRejectConfirm,
  encodeRejectPrompt,
  REJECT_REASONS,
  type RejectReasonCode,
} from "./callback-data.js";
import type { BotLogger, TelegramBotHandle } from "./telegram-bot.js";

type OrderWithRelations = Order & { user: User; plan: Plan; country: Country };

const HTML_ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escape user-controlled text before inlining into a Telegram `HTML` caption.
 * Mini App usernames, plan labels, and notes all pass through here — never
 * embed raw user input into the moderation card.
 */
function esc(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPE[c] ?? c);
}

/**
 * Publishes order moderation cards to the operator channel and edits them
 * in place once a reviewer acts. All Telegram I/O is wrapped in try/catch
 * so a network blip never bubbles up into the order-creation request — a
 * missed channel post must NOT roll back a valid order.
 */
export class ModerationService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly bot: TelegramBotHandle,
    private readonly logger: BotLogger,
  ) {}

  /**
   * Initial moderation post — sent when a fresh order lands in `pending`
   * or `processing`. Persists the resulting message id on the order so
   * later updates (status change, receipt arrival) can edit it.
   */
  async postOrderCard(order: OrderWithRelations): Promise<void> {
    if (!this.bot.isLive || !env.TELEGRAM_MODERATION_CHAT_ID) return;

    try {
      const message = await this.bot.sendMessage(
        env.TELEGRAM_MODERATION_CHAT_ID,
        this.renderCardCaption(order, null),
        {
          parse_mode: "HTML",
          reply_markup: this.buildKeyboard(order.id),
          disable_web_page_preview: true,
        },
      );
      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          telegramModerationChatId: String(env.TELEGRAM_MODERATION_CHAT_ID),
          telegramModerationMessageId: message.message_id,
        },
      });
    } catch (err) {
      this.logger.error({ err, orderId: order.id }, "telegram_moderation_post_failed");
    }
  }

  /**
   * Called after a receipt is uploaded. We can't `editMessageMedia` a text
   * message into a photo one, so we delete the old card and post a fresh
   * `sendPhoto` carrying the receipt + caption + the same approve/reject
   * keyboard. The new message id replaces the old one on the order row.
   */
  async attachReceipt(order: OrderWithRelations, receipt: Receipt): Promise<void> {
    if (!this.bot.isLive || !env.TELEGRAM_MODERATION_CHAT_ID) return;

    try {
      // Best-effort delete of the prior text card — ignore failure (might be
      // already gone if a reviewer manually nuked it).
      if (order.telegramModerationChatId && order.telegramModerationMessageId) {
        try {
          await this.bot.deleteMessage(
            order.telegramModerationChatId,
            order.telegramModerationMessageId,
          );
        } catch (err) {
          this.logger.debug({ err, orderId: order.id }, "telegram_delete_prior_card_failed");
        }
      }

      const absPath = path.resolve(env.RECEIPTS_STORAGE_DIR, receipt.storagePath);
      const photoBuffer = await fs.readFile(absPath);

      const message = await this.bot.sendPhoto(
        env.TELEGRAM_MODERATION_CHAT_ID,
        photoBuffer,
        {
          caption: this.renderCardCaption(order, receipt),
          parse_mode: "HTML",
          reply_markup: this.buildKeyboard(order.id),
        },
        {
          filename: path.basename(receipt.storagePath),
          contentType: receipt.mimeType,
        },
      );

      // Persist the new message id and (if Telegram returned one) the
      // file_id so later edits can reuse the upload without re-reading
      // the file off disk.
      const tgFileId =
        Array.isArray(message.photo) && message.photo.length > 0
          ? message.photo[message.photo.length - 1]?.file_id ?? null
          : null;

      await this.prisma.$transaction([
        this.prisma.order.update({
          where: { id: order.id },
          data: {
            telegramModerationChatId: String(env.TELEGRAM_MODERATION_CHAT_ID),
            telegramModerationMessageId: message.message_id,
          },
        }),
        ...(tgFileId
          ? [
              this.prisma.receipt.update({
                where: { id: receipt.id },
                data: { telegramFileId: tgFileId },
              }),
            ]
          : []),
      ]);
    } catch (err) {
      this.logger.error(
        { err, orderId: order.id, receiptId: receipt.id },
        "telegram_attach_receipt_failed",
      );
    }
  }

  /**
   * Mark the moderation card as resolved — strips the action keyboard and
   * appends a status line so operators see who handled it. Falls back to
   * `editMessageText` when there's no receipt photo on the message.
   */
  async markResolved(
    order: OrderWithRelations,
    decision: { status: "approved" | "rejected" | "cancelled" | "expired"; reviewerName: string; reasonLabel?: string },
  ): Promise<void> {
    if (!this.bot.isLive) return;
    if (!order.telegramModerationChatId || !order.telegramModerationMessageId) return;

    const footer = this.renderResolvedFooter(decision);
    const caption = `${this.renderCardCaption(order, null)}\n\n${footer}`;
    const target = {
      chat_id: order.telegramModerationChatId,
      message_id: order.telegramModerationMessageId,
    };

    // Try caption edit first (works if the card carries a receipt photo);
    // if Telegram says "there is no caption", fall back to plain text edit.
    try {
      await this.bot.editMessageCaption(caption, { ...target, parse_mode: "HTML" });
      await this.bot.editMessageReplyMarkup({ inline_keyboard: [] }, target);
    } catch (err) {
      try {
        await this.bot.editMessageText(caption, {
          ...target,
          parse_mode: "HTML",
          reply_markup: { inline_keyboard: [] },
        });
      } catch (innerErr) {
        this.logger.error(
          { err: innerErr, orderId: order.id },
          "telegram_mark_resolved_failed",
        );
      }
    }
  }

  /** Replace the keyboard with a reason-picker after the reviewer taps "reject". */
  async promptRejectReason(order: OrderWithRelations): Promise<void> {
    if (!this.bot.isLive) return;
    if (!order.telegramModerationChatId || !order.telegramModerationMessageId) return;

    try {
      await this.bot.editMessageReplyMarkup(
        {
          inline_keyboard: [
            ...(Object.keys(REJECT_REASONS) as RejectReasonCode[]).map((code) => [
              {
                text: REJECT_REASONS[code].label,
                callback_data: encodeRejectConfirm(order.id, code),
              },
            ]),
            [{ text: "↩️ Назад", callback_data: encodeApprove(order.id).replace("a:", "back:") }],
          ],
        },
        {
          chat_id: order.telegramModerationChatId,
          message_id: order.telegramModerationMessageId,
        },
      );
    } catch (err) {
      this.logger.error({ err, orderId: order.id }, "telegram_prompt_reject_failed");
    }
  }

  private buildKeyboard(orderId: string) {
    return {
      inline_keyboard: [
        [
          { text: "✅ Одобрить", callback_data: encodeApprove(orderId) },
          { text: "❌ Отклонить", callback_data: encodeRejectPrompt(orderId) },
        ],
      ],
    };
  }

  private renderCardCaption(order: OrderWithRelations, receipt: Receipt | null): string {
    const userHandle = order.user.username
      ? `@${esc(order.user.username)}`
      : esc(order.user.firstName);
    const amount = `${Number(order.amount).toFixed(2)} ${esc(order.currency)}`;
    const statusEmoji: Record<string, string> = {
      created: "🆕",
      pending: "🟡",
      processing: "🟠",
      approved: "✅",
      active: "🟢",
      rejected: "❌",
      expired: "⚪",
      cancelled: "⚫",
    };
    const lines = [
      `${statusEmoji[order.status] ?? "•"} <b>Order ${esc(order.id)}</b>`,
      `Status: <b>${esc(order.status)}</b>`,
      `User: ${userHandle} (<code>${order.user.telegramId.toString()}</code>)`,
      `Plan: <b>${esc(order.plan.label)}</b> · ${esc(order.country.name)} ${esc(order.country.flag)}`,
      `Amount: <b>${amount}</b>`,
    ];
    if (order.paymentReference) {
      lines.push(`Reference: <code>${esc(order.paymentReference)}</code>`);
    }
    if (receipt) {
      lines.push(`Receipt: <code>${esc(receipt.checksum.slice(0, 12))}</code> · ${receipt.sizeBytes}B`);
    }
    lines.push(`Created: <i>${order.createdAt.toISOString()}</i>`);
    return lines.join("\n");
  }

  private renderResolvedFooter(decision: {
    status: "approved" | "rejected" | "cancelled" | "expired";
    reviewerName: string;
    reasonLabel?: string;
  }): string {
    const emoji =
      decision.status === "approved"
        ? "✅"
        : decision.status === "rejected"
          ? "❌"
          : decision.status === "cancelled"
            ? "🚫"
            : "⌛";
    const head = `${emoji} <b>${esc(decision.status.toUpperCase())}</b> by ${esc(decision.reviewerName)}`;
    return decision.reasonLabel ? `${head}\nReason: ${esc(decision.reasonLabel)}` : head;
  }
}
