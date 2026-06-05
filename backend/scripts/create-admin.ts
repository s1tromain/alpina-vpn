import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password.js";

/**
 * Create (or update) a web-admin-panel login.
 *
 * Sets the account's role to `admin`, assigns a password (scrypt hash), and
 * upserts by Telegram ID so it's safe to re-run (e.g. to rotate the password).
 *
 * Usage:
 *   ADMIN_PASSWORD=secret npm run admin:create
 *   ADMIN_TELEGRAM_ID=8366916766 ADMIN_USERNAME=emdjoi ADMIN_PASSWORD=secret npm run admin:create
 *   npm run admin:create -- --telegram-id 8366916766 --username emdjoi --password secret
 *
 * Defaults target the first administrator requested in the spec:
 *   Telegram ID 8366916766, username "emdjoi".
 */

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const prisma = new PrismaClient();

async function main() {
  const telegramIdRaw =
    arg("telegram-id") ?? process.env.ADMIN_TELEGRAM_ID ?? "8366916766";
  const username = arg("username") ?? process.env.ADMIN_USERNAME ?? "emdjoi";
  const password = arg("password") ?? process.env.ADMIN_PASSWORD;
  const firstName =
    arg("first-name") ?? process.env.ADMIN_FIRST_NAME ?? username;

  if (!password) {
    console.error(
      "Missing password. Pass --password <value> or set ADMIN_PASSWORD.",
    );
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  let telegramId: bigint;
  try {
    telegramId = BigInt(telegramIdRaw);
  } catch {
    console.error(`Invalid Telegram ID: ${telegramIdRaw}`);
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { telegramId },
    create: {
      telegramId,
      username,
      firstName,
      role: "admin",
      passwordHash,
    },
    update: {
      username,
      role: "admin",
      passwordHash,
    },
  });

  console.log(
    `✓ Admin ready: id=${user.id} username=@${user.username} telegramId=${user.telegramId} role=${user.role}`,
  );
}

main()
  .catch((err) => {
    console.error("Failed to create admin:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
