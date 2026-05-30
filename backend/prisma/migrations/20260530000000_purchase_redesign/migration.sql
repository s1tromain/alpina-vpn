-- Purchase flow redesign.
--
-- * OrderStatus gains `created` (order placed, no receipt) and `active`
--   (provisioned + live). Legacy `processing` is kept for historical rows.
-- * Plans move from duration-based to tier-based: drop `duration` +
--   `monthlyEquivalent`, add `tier` + `durationDays`. Drop the now-unused
--   `PlanDuration` enum.
-- * Payment requisites move from crypto fields to card fields.

-- ── OrderStatus: additive enum values ──────────────────────────────────────
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'created' BEFORE 'pending';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'active' AFTER 'approved';

-- ── PlanTier enum ──────────────────────────────────────────────────────────
CREATE TYPE "PlanTier" AS ENUM ('starter', 'standard', 'premium');

-- ── Plan reshape ───────────────────────────────────────────────────────────
ALTER TABLE "plans" ADD COLUMN "tier" "PlanTier";
ALTER TABLE "plans" ADD COLUMN "durationDays" INTEGER NOT NULL DEFAULT 30;

-- Best-effort backfill of `tier` for any pre-existing rows before NOT NULL.
UPDATE "plans" SET "tier" = 'premium'  WHERE "tier" IS NULL AND "priceUsd" >= 10;
UPDATE "plans" SET "tier" = 'standard' WHERE "tier" IS NULL AND "priceUsd" >= 5;
UPDATE "plans" SET "tier" = 'starter'  WHERE "tier" IS NULL;
ALTER TABLE "plans" ALTER COLUMN "tier" SET NOT NULL;

ALTER TABLE "plans" DROP COLUMN "duration";
ALTER TABLE "plans" DROP COLUMN "monthlyEquivalent";

-- PlanDuration is no longer referenced by any column.
DROP TYPE "PlanDuration";

-- ── PaymentRequisite reshape ───────────────────────────────────────────────
-- Add new columns with a transient default so existing sample rows stay valid,
-- then drop the default to match the schema (which declares no default).
ALTER TABLE "payment_requisites" ADD COLUMN "title" TEXT NOT NULL DEFAULT '';
ALTER TABLE "payment_requisites" ADD COLUMN "cardNumber" TEXT NOT NULL DEFAULT '';
ALTER TABLE "payment_requisites" ADD COLUMN "ownerName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "payment_requisites" ADD COLUMN "bankName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "payment_requisites" ADD COLUMN "qrImage" TEXT;
ALTER TABLE "payment_requisites" ADD COLUMN "instructions" TEXT;

ALTER TABLE "payment_requisites" ALTER COLUMN "title" DROP DEFAULT;
ALTER TABLE "payment_requisites" ALTER COLUMN "cardNumber" DROP DEFAULT;
ALTER TABLE "payment_requisites" ALTER COLUMN "ownerName" DROP DEFAULT;
ALTER TABLE "payment_requisites" ALTER COLUMN "bankName" DROP DEFAULT;

DROP INDEX "payment_requisites_active_method_idx";

ALTER TABLE "payment_requisites" DROP COLUMN "method";
ALTER TABLE "payment_requisites" DROP COLUMN "label";
ALTER TABLE "payment_requisites" DROP COLUMN "address";
ALTER TABLE "payment_requisites" DROP COLUMN "currency";
ALTER TABLE "payment_requisites" DROP COLUMN "network";

CREATE INDEX "payment_requisites_active_idx" ON "payment_requisites"("active");

-- NB: the `PaymentMethod` enum is intentionally retained (no longer referenced)
-- to avoid an unnecessary DROP TYPE; it is harmless and may be reused later.
