import "dotenv/config";
import { z } from "zod";

/**
 * Strict environment parsing. Anything not whitelisted here cannot be read
 * directly from `process.env` elsewhere in the app — import `env` instead.
 *
 * Fail loudly at boot: missing/invalid env = process exit. We do NOT want
 * runtime surprises after deploy.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(4000),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),

  CORS_ORIGINS: z.string().default("http://localhost:3000"),

  DATABASE_URL: z.string().url(),

  TELEGRAM_BOT_TOKEN: z.string().min(10, "TELEGRAM_BOT_TOKEN is required"),
  ALLOW_DEV_AUTH: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  TELEGRAM_AUTH_TTL_SECONDS: z.coerce.number().int().positive().default(86400),

  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 chars"),
  JWT_ACCESS_TTL: z.string().default("7d"),

  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_WINDOW: z.string().default("1 minute"),

  BOOTSTRAP_ADMIN_TELEGRAM_IDS: z
    .string()
    .default("")
    .transform((v) =>
      v
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => BigInt(s)),
    ),

  VPN_PROVIDER: z.enum(["mock", "marzban"]).default("mock"),
  MARZBAN_API_URL: z.string().url().optional(),
  MARZBAN_API_USERNAME: z.string().optional(),
  MARZBAN_API_PASSWORD: z.string().optional(),

  // ── Telegram bot / moderation ──────────────────────────────────────────────
  /// disabled = no bot started (useful for tests/CI/local Mini App work);
  /// polling = long-polling (dev);
  /// webhook = HTTPS webhook (prod) — requires TELEGRAM_WEBHOOK_DOMAIN.
  TELEGRAM_BOT_MODE: z.enum(["disabled", "polling", "webhook"]).default("disabled"),
  /// Bot @username — used in start-button deep links and DMs. Without `@`.
  TELEGRAM_BOT_USERNAME: z.string().optional(),
  /// Chat id (negative for supergroups/channels) where moderation cards are posted.
  /// Required when TELEGRAM_BOT_MODE != "disabled".
  TELEGRAM_MODERATION_CHAT_ID: z.string().optional(),
  /// Fully-qualified HTTPS URL (no trailing slash) of this backend, used to
  /// build the webhook URL. Required only when TELEGRAM_BOT_MODE=webhook.
  TELEGRAM_WEBHOOK_DOMAIN: z.string().url().optional(),
  /// Random secret embedded in the webhook URL path AND verified via the
  /// X-Telegram-Bot-Api-Secret-Token header. Required for webhook mode.
  TELEGRAM_WEBHOOK_SECRET: z.string().min(16).optional(),
  /// Public URL of the Mini App, sent in user-facing buttons (open-app links).
  MINI_APP_URL: z.string().url().default("https://t.me"),

  // ── Receipts storage ───────────────────────────────────────────────────────
  /// Absolute or backend-relative directory where receipt files live on disk.
  RECEIPTS_STORAGE_DIR: z.string().default("./storage/receipts"),
  /// Maximum receipt size in bytes — Telegram channel uploads stay under 10MB
  /// for `sendPhoto`; we cap at 8MB to keep a margin.
  RECEIPTS_MAX_BYTES: z.coerce.number().int().positive().default(8 * 1024 * 1024),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  // eslint-disable-next-line no-console
  console.error(
    "[env] Invalid environment configuration:\n",
    parsed.error.flatten().fieldErrors,
  );
  process.exit(1);
}

export const env = parsed.data;

export const isProd = env.NODE_ENV === "production";
export const isDev = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";

if (isProd && env.ALLOW_DEV_AUTH) {
  // Hard refuse to start with the dev bypass in prod.
  // eslint-disable-next-line no-console
  console.error("[env] ALLOW_DEV_AUTH=true is forbidden in production.");
  process.exit(1);
}

// Defence-in-depth: refuse to boot in prod if the JWT secret looks like
// a known placeholder. The min-length check in the schema only catches
// "too short", not "everyone copy-pasted the example".
const PLACEHOLDER_SECRETS = new Set([
  "change-me-to-a-long-random-string",
  "your-secret-here",
  "secret",
  "test",
]);
if (isProd && PLACEHOLDER_SECRETS.has(env.JWT_SECRET)) {
  // eslint-disable-next-line no-console
  console.error("[env] JWT_SECRET is a known placeholder — rotate before boot.");
  process.exit(1);
}

// Cross-field Telegram bot validation: webhook mode needs a domain + secret;
// any non-disabled mode needs a moderation chat to send order cards to. We
// validate here (not in the Zod schema) because `.refine()` would force every
// callsite that reads `env` to handle a union-of-schemas type — easier to
// throw early than to type-narrow on every TELEGRAM_* access.
if (env.TELEGRAM_BOT_MODE !== "disabled" && !env.TELEGRAM_MODERATION_CHAT_ID) {
  // eslint-disable-next-line no-console
  console.error(
    "[env] TELEGRAM_MODERATION_CHAT_ID is required when TELEGRAM_BOT_MODE is not 'disabled'.",
  );
  process.exit(1);
}
if (env.TELEGRAM_BOT_MODE === "webhook") {
  if (!env.TELEGRAM_WEBHOOK_DOMAIN || !env.TELEGRAM_WEBHOOK_SECRET) {
    // eslint-disable-next-line no-console
    console.error(
      "[env] TELEGRAM_BOT_MODE=webhook requires TELEGRAM_WEBHOOK_DOMAIN and TELEGRAM_WEBHOOK_SECRET.",
    );
    process.exit(1);
  }
}
