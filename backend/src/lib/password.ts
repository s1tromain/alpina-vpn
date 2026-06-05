import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing for the web admin panel's username/password login.
 *
 * Uses Node's built-in `scrypt` (no external dependency). The stored format
 * is `salt:hash`, both hex-encoded. Verification is constant-time.
 *
 * scrypt parameters: N=16384 (2^14), r=8, p=1 — the Node defaults, a sane
 * interactive-login cost. The 16-byte salt and 64-byte key are standard.
 */

const scrypt = promisify(scryptCallback);

const KEY_LENGTH = 64;
const SALT_LENGTH = 16;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) return false;
  const [saltHex, hashHex] = stored.split(":");
  if (!saltHex || !hashHex) return false;

  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const derived = (await scrypt(password, salt, expected.length)) as Buffer;

  // Length guard before timingSafeEqual (it throws on length mismatch).
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}
