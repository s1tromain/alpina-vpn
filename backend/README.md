# Alpina VPN — Backend

Fastify + TypeScript + Prisma + PostgreSQL backend for the Alpina VPN
Telegram Mini App. Pairs with the existing Next.js 15 frontend (Mini App +
admin panel) and matches its typed API client (`src/lib/api.ts`).

> **MVP scope.** Real VPN provisioning is deferred — the provider layer is
> abstracted behind `VpnProvider` and ships with a `MockVpnProvider`. The
> integration target is Marzban (Xray/Reality). Swap providers via
> `VPN_PROVIDER=marzban` with no service-layer changes.

---

## Tech

- **Runtime:** Node.js 20 (ESM, strict TS)
- **Framework:** Fastify 4
- **DB:** PostgreSQL 16 + Prisma 5
- **Auth:** Telegram Mini App `initData` (HMAC-SHA256) + JWT bearer
- **Validation:** Zod
- **Logging:** Pino (pretty in dev, JSON in prod)
- **Docker:** multi-stage build, Compose with Postgres

---

## Folder layout

```
backend/
├── prisma/
│   ├── schema.prisma          # DB models + enums
│   └── seed.ts                # idempotent local-dev seed
├── src/
│   ├── config/env.ts          # zod-parsed env, fails fast at boot
│   ├── lib/                   # prisma, logger, errors, BigInt JSON shim
│   ├── plugins/               # fastify plugins (auth, security, error, prisma)
│   ├── modules/
│   │   ├── auth/              # POST /auth/telegram, GET /auth/me
│   │   ├── users/             # GET /users/me + mappers shared across modules
│   │   ├── orders/            # POST /orders, GET /orders/:id
│   │   ├── subscriptions/     # GET /subscriptions/me + provisioning
│   │   ├── requisites/        # GET /payments/requisites (active only)
│   │   ├── notifications/     # GET /notifications, POST /read-all
│   │   ├── catalog/           # GET /plans, /countries
│   │   ├── admin/             # /admin/*  — admin + operator
│   │   └── vpn/               # provider interface + mock + marzban stub
│   ├── types/fastify.d.ts     # module augmentations
│   ├── utils/zod.ts           # validateBody/Query/Params
│   ├── app.ts                 # buildApp()
│   └── server.ts              # boot + graceful shutdown
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── package.json
```

---

## Running locally

```bash
cp .env.example .env             # then edit TELEGRAM_BOT_TOKEN + JWT_SECRET
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run db:seed
npm run dev                      # http://localhost:4000
```

The frontend's `src/lib/api.ts` already calls `/api/*`. Point it at
`http://localhost:4000` (or proxy via Next.js rewrites).

### Docker

```bash
docker compose up --build
```

Container runs `prisma migrate deploy` on boot and listens on `:4000`.

---

## API surface

All authenticated routes accept either:

- `Authorization: Bearer <jwt>`  (issued by `POST /auth/telegram`)
- `X-Telegram-Init-Data: <raw initData>`  (what the existing frontend sends)

| Method | Path                              | Auth     | Notes |
| -----: | --------------------------------- | -------- | ----- |
|    GET | `/health`                         | **public** | Liveness — no I/O |
|    GET | `/health/db`                      | **public** | Readiness — Prisma `SELECT 1`, uptime, VPN provider |
|   POST | `/api/auth/telegram`              | none     | Verifies initData HMAC, upserts user, returns `{token, user}`. Rate-limited to 20/min. |
|    GET | `/api/auth/me`                    | user     | Current user incl. subscription |
|    GET | `/api/users/me`                   | user     | Alias of `/auth/me` |
|    GET | `/api/users/me/orders`            | user     | Purchase history |
|    GET | `/api/users/me/subscription`      | user     | Active/paused subscription or `null` |
|    GET | `/api/subscriptions/me`           | user     | Alias of above |
|   POST | `/api/orders`                     | user     | Body: `{planId, countryCode, requisiteId}` |
|    GET | `/api/orders`                     | user     | History (alias) |
|    GET | `/api/orders/:id`                 | user/staff | Owner or operator/admin |
|   POST | `/api/orders/:id/paid`            | user     | pending → processing |
|    GET | `/api/plans`                      | **public** | Catalogue (active plans) |
|    GET | `/api/countries`                  | **public** | Catalogue (active countries) |
|    GET | `/api/vpn/servers`                | **public** | Flat list of all VPN nodes incl. status |
|    GET | `/api/payments/requisites`        | user     | Active requisites only (checkout) |
|    GET | `/api/notifications`              | user     | Last 100 |
|    GET | `/api/notifications/unread-count` | user     | `{count: number}` |
|   POST | `/api/notifications/read-all`     | user     |  |
|   POST | `/api/notifications/:id/read`     | user     |  |
|    GET | `/api/admin/stats`                | staff    | Dashboard KPIs |
|    GET | `/api/admin/orders`               | staff    | Filterable by status + paginate |
|  PATCH | `/api/admin/orders/:id`           | staff    | Approve/reject/cancel — atomic on approve |
|    GET | `/api/admin/users`                | staff    | Search/paginate |
|  PATCH | `/api/admin/users/:id/role`       | admin    | Change role |
|    GET | `/api/admin/requisites`           | staff    | Includes `receivedTotalUsd` |
|   POST | `/api/admin/requisites`           | admin    | Create |
|  PATCH | `/api/admin/requisites/:id`       | admin    | Update + activate/deactivate toggle |
| DELETE | `/api/admin/requisites/:id`       | admin    | Soft delete (refused while open orders) |

---

## Order → Subscription flow

1. User picks plan + country + requisite → `POST /api/orders` creates a
   `pending` row with a 24 h TTL.
2. User pays out-of-band → `POST /api/orders/:id/paid` flips it to
   `processing`.
3. Operator reviews in the admin panel and `PATCH /api/admin/orders/:id`:
   - `approved` runs a **single transaction**: update order, mint
     subscription via `VpnProvider.provision()`, increment
     `paymentRequisite.receivedTotalUsd`, write a `subscription_activated`
     notification, log an `AdminAction`.
   - `rejected` / `cancelled` writes a notification and an audit row only.

The frontend then reads `subscriptionUrl` from `/users/me/subscription`.

### Subscription lifecycle

`SubscriptionsService` is the only thing that drives state transitions —
admin endpoints and the background expiry sweep both call into it:

- `createFromOrder()` — minted inside the order-approval transaction;
  refuses to create a second active subscription per user.
- `suspendSubscription(id, reason?)` — `active → suspended`, idempotent.
- `resumeSubscription(id)` — `suspended → active`, refuses once past expiry.
- `expireSubscription(id)` — `active|suspended → expired` when past expiry;
  also used by the sweep.
- `revokeSubscription(id)` — irreversible: provider revoke + row delete.
- `expireDueSubscriptions()` — cron entry point; sweeps past-due rows.

---

## VPN provider swap

```ts
// src/modules/vpn/index.ts
if (env.VPN_PROVIDER === "marzban") {
  provider = new MarzbanVpnProvider({ ... });
} else {
  provider = new MockVpnProvider();
}
```

`MarzbanVpnProvider` is a stub today — the contract (`provision`, `suspend`,
`resume`, `revoke`) is what the rest of the codebase consumes.

---

## Security

- **HMAC verification** of every initData payload, with a 24 h freshness
  window (`TELEGRAM_AUTH_TTL_SECONDS`).
- **Constant-time** hash comparison via `crypto.timingSafeEqual`.
- **Role guards** (`app.requireRole`) chained after `app.authenticate`.
- **Global rate limit** ~120 req/min per IP (configurable). `POST
  /api/auth/telegram` is independently capped at 20/min/IP to slow HMAC
  brute-force attempts.
- **Helmet** with `frameguard: deny`, `referrerPolicy: no-referrer` in
  prod; CSP/COEP off because we ship JSON only.
- **CORS** strict allowlist; the security plugin refuses to boot if
  `CORS_ORIGINS='*'` in production.
- **Env validation** at boot — production refuses to start with
  `ALLOW_DEV_AUTH=true`.
- **Body limit** 256 KB — there are no upload routes; anything larger is
  rejected at the network layer.
- **Request IDs** generated per-request (or honoured from upstream
  `X-Request-Id`) and echoed back in the response header.
- **Sensitive log redaction**: authorization, telegram init data, cookies.
- **Soft-delete** on requisites preserves order history integrity;
  deletion is refused while open orders reference the requisite.
- **Audit log** (`admin_actions`) for every role change, order decision,
  and requisite mutation — written in the same transaction as the change.

---

## Bootstrap admins

Set `BOOTSTRAP_ADMIN_TELEGRAM_IDS=123,456` and those Telegram IDs are
promoted to `admin` on first login. Subsequent role changes go through
`PATCH /api/admin/users/:id/role`. Admins cannot change *their own* role
through that endpoint — promote a peer first if you need to demote yourself.

---

## Production deployment

### Single-VPS (Docker Compose)

```bash
git clone <repo> && cd backend
cp .env.example .env  # edit secrets
docker compose up -d --build
```

The Compose file runs `prisma migrate deploy` on container start; new
migrations applied at deploy time.

### Behind a reverse proxy

`trustProxy: true` is set, so `X-Forwarded-For` is honoured. Terminate
TLS at the proxy (nginx/Caddy/Traefik) and forward to `:4000`. Add an
`X-Request-Id` header upstream if you want to correlate proxy + app logs.

### Healthchecks for orchestrators

```yaml
livenessProbe:
  httpGet: { path: /health,    port: 4000 }
readinessProbe:
  httpGet: { path: /health/db, port: 4000 }
```

The readiness probe gates traffic on Prisma connectivity. During
shutdown the process exits 0 within ~10s, or 124 if `app.close()` hangs.

### Required env in production

- `NODE_ENV=production`
- `TELEGRAM_BOT_TOKEN` — real bot token from @BotFather
- `JWT_SECRET` — ≥32 chars of high-entropy random
- `DATABASE_URL` — pointing at the production Postgres
- `CORS_ORIGINS` — explicit Mini App + admin panel origins (never `*`)
- `BOOTSTRAP_ADMIN_TELEGRAM_IDS` — at least one admin
- `ALLOW_DEV_AUTH=false` (the env validator refuses any other value in prod)
