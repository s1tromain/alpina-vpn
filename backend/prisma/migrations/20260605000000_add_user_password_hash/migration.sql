-- Add optional password hash for the web admin panel (username/password login).
-- Null = Telegram-only account with no password login.
ALTER TABLE "users" ADD COLUMN "passwordHash" TEXT;
