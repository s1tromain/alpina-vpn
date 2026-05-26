-- AlterEnum: NotificationKind — add two new lifecycle kinds.
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'order_pending';
ALTER TYPE "NotificationKind" ADD VALUE IF NOT EXISTS 'order_processing';

-- AlterEnum: AdminActionKind — audit kind for receipt uploads.
ALTER TYPE "AdminActionKind" ADD VALUE IF NOT EXISTS 'receipt_upload';

-- AlterTable: orders — Telegram moderation message reference.
ALTER TABLE "orders"
  ADD COLUMN "telegramModerationChatId"    TEXT,
  ADD COLUMN "telegramModerationMessageId" INTEGER;

-- CreateTable: receipts.
CREATE TABLE "receipts" (
    "id"             TEXT         NOT NULL,
    "orderId"        TEXT         NOT NULL,
    "storagePath"    TEXT         NOT NULL,
    "mimeType"       TEXT         NOT NULL,
    "sizeBytes"      INTEGER      NOT NULL,
    "checksum"       TEXT         NOT NULL,
    "telegramFileId" TEXT,
    "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "receipts_orderId_createdAt_idx" ON "receipts"("orderId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "receipts"
  ADD CONSTRAINT "receipts_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
