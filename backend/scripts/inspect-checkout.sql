-- Alpina VPN — checkout configuration inspection.
--
-- Run against the production database to confirm the root cause of
-- "purchase does nothing": the Mini App silently blocks order creation when
-- no ACTIVE PaymentRequisite exists, and OrdersService.create also requires
-- an ACTIVE Country. Plans are included for completeness.
--
-- Usage (from the host, against the compose Postgres):
--   docker compose exec -T postgres \
--     psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f - < backend/scripts/inspect-checkout.sql
--
-- NOTE: Prisma creates camelCase columns, which Postgres folds to lowercase
-- unless double-quoted. The quoted identifiers below are required.

\echo '== Payment requisites (all rows) =='
SELECT id, title, "bankName", "ownerName", active, "deletedAt", "createdAt"
FROM payment_requisites
ORDER BY "createdAt" DESC;

\echo '== Active payment requisites (exactly what GET /api/payments/requisites returns) =='
SELECT count(*) AS active_requisites
FROM payment_requisites
WHERE active = true AND "deletedAt" IS NULL;

\echo '== Countries (all rows) =='
SELECT code, name, active, premium, ping, load
FROM countries
ORDER BY name;

\echo '== Active countries (order creation pins to DEFAULT_REGION_CODE or any active) =='
SELECT count(*) AS active_countries
FROM countries
WHERE active = true;

\echo '== Plans (all rows) =='
SELECT id, slug, tier, label, "priceUsd", "durationDays", active, "sortOrder"
FROM plans
ORDER BY "sortOrder";

\echo '== Active plans (what GET /api/plans returns) =='
SELECT count(*) AS active_plans
FROM plans
WHERE active = true;
