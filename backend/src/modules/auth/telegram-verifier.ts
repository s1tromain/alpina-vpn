import crypto from "node:crypto";
import { UnauthorizedError } from "../../lib/errors.js";

/**
 * Verify a Telegram Mini App `initData` string per the official spec:
 *
 *   secret_key  = HMAC_SHA256(key="WebAppData", message=bot_token)
 *   computed    = HMAC_SHA256(key=secret_key, message=data_check_string)
 *
 * where `data_check_string` is the alphabetically-sorted "key=value\nkey=value…"
 * concatenation of all fields except `hash`.
 *
 * Spec: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export interface VerifiedTelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface VerifiedInitData {
  user: VerifiedTelegramUser;
  authDate: Date;
  queryId?: string;
  /** Hash that we matched against, useful for replay tracking. */
  hash: string;
}

export interface VerifyOptions {
  botToken: string;
  /** Reject init data older than N seconds. Telegram recommends 24h. */
  maxAgeSeconds: number;
}

export function verifyTelegramInitData(
  initData: string,
  opts: VerifyOptions,
): VerifiedInitData {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) throw new UnauthorizedError("initData: missing hash");

  // Build the data-check string from all fields except `hash`,
  // sorted alphabetically by key.
  const pairs: string[] = [];
  params.forEach((value, key) => {
    if (key === "hash") return;
    pairs.push(`${key}=${value}`);
  });
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secretKey = crypto
    .createHmac("sha256", "WebAppData")
    .update(opts.botToken)
    .digest();

  const computed = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  // Constant-time comparison
  const ok =
    computed.length === hash.length &&
    crypto.timingSafeEqual(Buffer.from(computed, "hex"), Buffer.from(hash, "hex"));

  if (!ok) throw new UnauthorizedError("initData: signature mismatch");

  // Freshness check
  const authDateRaw = params.get("auth_date");
  if (!authDateRaw) throw new UnauthorizedError("initData: missing auth_date");
  const authDate = new Date(Number(authDateRaw) * 1000);
  const ageSeconds = (Date.now() - authDate.getTime()) / 1000;
  if (ageSeconds > opts.maxAgeSeconds) {
    throw new UnauthorizedError("initData: expired");
  }

  // Parse `user` JSON blob
  const userRaw = params.get("user");
  if (!userRaw) throw new UnauthorizedError("initData: missing user");
  let user: VerifiedTelegramUser;
  try {
    user = JSON.parse(userRaw);
  } catch {
    throw new UnauthorizedError("initData: malformed user payload");
  }
  if (typeof user.id !== "number" || typeof user.first_name !== "string") {
    throw new UnauthorizedError("initData: invalid user fields");
  }

  return {
    user,
    authDate,
    queryId: params.get("query_id") ?? undefined,
    hash,
  };
}
