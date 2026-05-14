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
