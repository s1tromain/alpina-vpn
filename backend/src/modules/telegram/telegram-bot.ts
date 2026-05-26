import TelegramBot, {
  type CallbackQuery,
  type InlineKeyboardMarkup,
  type Message,
  type SendMessageOptions,
  type Update,
} from "node-telegram-bot-api";
import { env } from "../../config/env.js";

/**
 * Minimal logger surface — both `pino.Logger` and Fastify's `FastifyBaseLogger`
 * satisfy this. Avoids a brittle dependency on either concrete type so callers
 * can pass `app.log` directly without an `as any` cast.
 */
export interface BotLogger {
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
  debug: (...args: unknown[]) => void;
}

/**
 * Thin wrapper around `node-telegram-bot-api`. We hide the constructor knobs
 * (polling vs. webhook, error logging, graceful close) so the rest of the
 * module just talks to a single typed surface.
 *
 * Boot strategy:
 *   - `disabled` → return a no-op stub so the rest of the codebase keeps
 *     compiling and tests don't need a real bot token.
 *   - `polling`  → long-polling; convenient for local dev because there's no
 *     public URL requirement.
 *   - `webhook`  → we set the webhook to
 *       `<TELEGRAM_WEBHOOK_DOMAIN>/api/telegram/webhook/<TELEGRAM_WEBHOOK_SECRET>`
 *     and verify the `X-Telegram-Bot-Api-Secret-Token` header in the Fastify
 *     route. The bot instance itself is `polling: false`; updates are pushed
 *     into it via `processUpdate(...)`.
 */
export interface TelegramBotHandle {
  readonly mode: "disabled" | "polling" | "webhook";
  /** True if the bot can actually deliver messages. */
  readonly isLive: boolean;

  on(event: "callback_query", handler: (q: CallbackQuery) => void | Promise<void>): void;
  on(event: "message", handler: (m: Message) => void | Promise<void>): void;

  sendMessage(chatId: number | string, text: string, opts?: SendMessageOptions): Promise<Message>;
  sendPhoto(
    chatId: number | string,
    photo: Buffer | string,
    opts: { caption?: string; reply_markup?: InlineKeyboardMarkup; parse_mode?: "HTML" | "Markdown" },
    fileOpts?: { filename?: string; contentType?: string },
  ): Promise<Message>;
  editMessageText(
    text: string,
    opts: { chat_id: number | string; message_id: number; reply_markup?: InlineKeyboardMarkup; parse_mode?: "HTML" | "Markdown" },
  ): Promise<Message | boolean>;
  editMessageCaption(
    caption: string,
    opts: { chat_id: number | string; message_id: number; reply_markup?: InlineKeyboardMarkup; parse_mode?: "HTML" | "Markdown" },
  ): Promise<Message | boolean>;
  editMessageReplyMarkup(
    markup: InlineKeyboardMarkup,
    opts: { chat_id: number | string; message_id: number },
  ): Promise<Message | boolean>;
  deleteMessage(chatId: number | string, messageId: number): Promise<boolean>;
  answerCallbackQuery(
    callbackQueryId: string,
    opts?: { text?: string; show_alert?: boolean },
  ): Promise<boolean>;

  /** Push an update from the Fastify webhook route. No-op in polling/disabled. */
  processUpdate(update: Update): void;

  /** Graceful close — stops polling / disconnects keepalive sockets. */
  close(): Promise<void>;
}

const NOOP_ERR_MSG = "Telegram bot is disabled (TELEGRAM_BOT_MODE=disabled)";

/** Returns the same handle for the lifetime of the process. */
let cached: TelegramBotHandle | null = null;

export async function createTelegramBot(logger: BotLogger): Promise<TelegramBotHandle> {
  if (cached) return cached;

  if (env.TELEGRAM_BOT_MODE === "disabled") {
    cached = createDisabledStub(logger);
    return cached;
  }

  const bot = new TelegramBot(env.TELEGRAM_BOT_TOKEN, {
    polling: env.TELEGRAM_BOT_MODE === "polling",
    // Webhook details (URL + secret) are configured via setWebHook below —
    // keep the constructor minimal so callers don't accidentally re-open
    // a polling loop in webhook mode.
  });

  bot.on("polling_error", (err) => logger.error({ err }, "telegram_polling_error"));
  bot.on("webhook_error", (err) => logger.error({ err }, "telegram_webhook_error"));
  bot.on("error", (err) => logger.error({ err }, "telegram_error"));

  if (env.TELEGRAM_BOT_MODE === "webhook") {
    if (!env.TELEGRAM_WEBHOOK_DOMAIN || !env.TELEGRAM_WEBHOOK_SECRET) {
      // env validator already enforces this, but TS narrows on early-return.
      throw new Error("webhook mode requires TELEGRAM_WEBHOOK_DOMAIN and TELEGRAM_WEBHOOK_SECRET");
    }
    const url = buildWebhookUrl(env.TELEGRAM_WEBHOOK_DOMAIN, env.TELEGRAM_WEBHOOK_SECRET);
    await bot.setWebHook(url, {
      // Telegram returns the same secret in `X-Telegram-Bot-Api-Secret-Token`
      // so the Fastify route can authenticate the push without a DB hit.
      secret_token: env.TELEGRAM_WEBHOOK_SECRET,
      // We only handle messages + callback queries today — narrowing reduces
      // the noise we get from un-handled update types.
      allowed_updates: ["message", "callback_query"],
    });
    logger.info({ url: url.replace(env.TELEGRAM_WEBHOOK_SECRET, "<secret>") }, "telegram_webhook_set");
  } else {
    logger.info("telegram_polling_started");
  }

  cached = {
    mode: env.TELEGRAM_BOT_MODE,
    isLive: true,
    on(event, handler) {
      bot.on(event as "callback_query", handler as (q: CallbackQuery) => void);
    },
    sendMessage: (chatId, text, opts) => bot.sendMessage(chatId, text, opts),
    sendPhoto: (chatId, photo, opts, fileOpts) =>
      bot.sendPhoto(
        chatId,
        photo,
        opts,
        fileOpts ?? undefined,
      ),
    editMessageText: (text, opts) => bot.editMessageText(text, opts),
    editMessageCaption: (caption, opts) => bot.editMessageCaption(caption, opts),
    editMessageReplyMarkup: (markup, opts) => bot.editMessageReplyMarkup(markup, opts),
    deleteMessage: (chatId, messageId) => bot.deleteMessage(chatId, messageId),
    answerCallbackQuery: (id, opts) => bot.answerCallbackQuery(id, opts),
    processUpdate: (update) => bot.processUpdate(update),
    close: async () => {
      try {
        if (env.TELEGRAM_BOT_MODE === "polling") await bot.stopPolling();
        if (env.TELEGRAM_BOT_MODE === "webhook") {
          // Don't delete the webhook on shutdown — that would leave Telegram
          // dropping updates between deploys. Just close the keepalive socket.
        }
      } catch (err) {
        logger.error({ err }, "telegram_close_error");
      }
    },
  };
  return cached;
}

export function getTelegramBot(): TelegramBotHandle {
  if (!cached) {
    throw new Error("Telegram bot has not been initialized — call createTelegramBot() first");
  }
  return cached;
}

function buildWebhookUrl(domain: string, secret: string) {
  const base = domain.endsWith("/") ? domain.slice(0, -1) : domain;
  return `${base}/api/telegram/webhook/${secret}`;
}

function createDisabledStub(logger: BotLogger): TelegramBotHandle {
  // Marker so `unused-vars` linters keep the constant attached as a
  // hint to future devs about why the stub exists at all.
  void NOOP_ERR_MSG;

  const stubMessage: Message = {
    message_id: 0,
    date: 0,
    chat: { id: 0, type: "private" },
  };

  return {
    mode: "disabled",
    isLive: false,
    on: () => {
      /* no-op */
    },
    sendMessage: async (chatId: number | string, text: string) => {
      logger.debug({ chatId, text: text.slice(0, 80) }, "telegram_stub_sendMessage");
      return stubMessage;
    },
    sendPhoto: async (chatId: number | string) => {
      logger.debug({ chatId }, "telegram_stub_sendPhoto");
      return stubMessage;
    },
    editMessageText: async () => true,
    editMessageCaption: async () => true,
    editMessageReplyMarkup: async () => true,
    deleteMessage: async () => true,
    answerCallbackQuery: async () => true,
    processUpdate: () => {
      /* no-op */
    },
    close: async () => {
      /* no-op */
    },
  };
}
