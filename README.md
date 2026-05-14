# Alpina VPN — Telegram Mini App

A premium, alpine-inspired minimalist Telegram Mini App for a private VPN service. Built with Next.js 15, TypeScript, TailwindCSS, shadcn-style primitives and Framer Motion.

## Quick start

```bash
npm install
npm run dev
```

Open the app inside Telegram (set up via BotFather → Menu Button → WebApp URL) or visit `http://localhost:3000` in a browser for development.

Admin console lives at `/admin`.

## Stack

- **Next.js 15** App Router (RSC + Client islands)
- **TypeScript** strict mode
- **TailwindCSS** with a custom graphite/silver palette
- **Framer Motion** for choreographed motion
- **Radix UI primitives** wrapped in shadcn-style components
- **Zustand** for ephemeral client state
- **Sonner** for toasts
- **qrcode.react** for subscription QR
- **Telegram WebApp SDK** loaded via `<Script strategy="beforeInteractive" />`

## Folder layout

```
src/
├── app/                      # Next.js App Router
│   ├── layout.tsx            # Root layout · fonts · Telegram script · Toaster
│   ├── globals.css           # Tokens · base utilities · glassmorphism
│   ├── page.tsx              # Home
│   ├── profile/page.tsx
│   ├── purchase/page.tsx
│   ├── orders/page.tsx       # Purchase history
│   ├── access/page.tsx       # VPN access · QR · downloads
│   ├── support/page.tsx
│   ├── admin/
│   │   ├── layout.tsx
│   │   ├── page.tsx          # Dashboard
│   │   ├── users/page.tsx
│   │   ├── orders/page.tsx
│   │   └── requisites/page.tsx
│   └── api/                  # Mock REST endpoints
│       ├── auth/me
│       ├── profile
│       ├── plans
│       ├── countries
│       ├── subscriptions/me
│       ├── orders          (+ /[id]/paid)
│       ├── payments/requisites
│       └── admin/
│           ├── stats
│           ├── users
│           ├── orders        (+ /[id])
│           └── requisites    (+ /[id])
├── components/
│   ├── ui/                   # Button · Card · Badge · Input · Tabs · Skeleton · Dialog · Separator
│   ├── layout/               # AppShell · BottomNav · Brand
│   ├── shared/               # GlassCard · PageHeader · SectionHeading · EmptyState · StatusPill
│   ├── home/                 # Hero · VpnStatusCard · CountriesRow · PlansGrid · FeaturesSection
│   └── admin/                # AdminSidebar · AdminTopbar · StatCard · DataTable
├── hooks/                    # use-telegram · use-copy
├── lib/                      # utils · telegram (haptics, init) · api client
├── stores/                   # user-store · vpn-store
├── data/                     # Mock fixtures
└── types/                    # Domain models
```

## Design system

| Token | Value |
| --- | --- |
| Palette | Graphite (`#050506` → `#28282d`) + Silver (`#8a8a8a` → `#e8e8e8`) |
| Typography | Inter (sans), Playfair Display (serif accents) |
| Surfaces | Glassmorphism: `bg-white/[0.02]` · `backdrop-blur-2xl` · `border-white/[0.06]` |
| Motion | Spring 400/32 for nav transitions; 0.4 s ease-out for entrance fades |
| Radius | 24–28 px rounded; pills for chips/nav |

## Telegram integration

- `src/lib/telegram.ts` — typed wrapper for `window.Telegram.WebApp`, including `haptic()` helper covering impact + notification + selection feedback.
- `useTelegram()` hook calls `tg.ready()` / `tg.expand()`, locks header + bg color to brand graphite, and exposes `initDataUnsafe.user`.
- `api.auth.me(initData)` sends the raw initData via `X-Telegram-Init-Data` for HMAC verification on the backend.

## Backend contract

All mock endpoints under `/api/*` mirror the production shape. Replace internals with a real backend (Postgres, Telegram bot worker, payment verifier) — the front-end consumes the typed `api` client from `src/lib/api.ts` with no changes.

## Admin gate

`src/middleware.ts` protects every `/admin/*` route. It resolves the requester's Telegram ID from:

1. `x-telegram-id` header (set by a server-side proxy after verifying initData)
2. `tg_id` cookie (issued post-verification)

The allowlist is configured via `ADMIN_ALLOWED_TELEGRAM_IDS` (comma-separated env). In development with no allowlist the gate is open to keep prototyping smooth; production builds always enforce.

## Domain model — what's in `src/types`

| Entity | Notes |
| --- | --- |
| `User` | Includes `role: "admin" \| "operator" \| "user"` |
| `Subscription` | Tracks `maxDevices`, `activeDevices`, `trafficLimit` (null = unlimited), `trafficUsed`, `autoRenew` |
| `Order` | Six statuses: `pending` · `processing` · `approved` · `rejected` · `expired` · `cancelled` |
| `VPNServer` | `country`, `city`, `flag`, `status: "online" \| "offline" \| "maintenance"`, `load`, `ping`, `bandwidth`, `protocol` |
| `PaymentRequisite` | Admin sees `receivedTotalUsd` aggregate |
| `Plan` | Per-plan `maxDevices` and `trafficLimit` |

## Purchase flow

The `/purchase` page is a 4-step wizard with motion transitions:

1. **Plan** — large pill cards with per-plan device count and unlimited-traffic tag
2. **Country** — flag grid with ping + load + Premier marker
3. **Payment** — method selector + glass requisite card (copy, network, exact amount)
4. **Confirm** — full summary + "I paid — submit order" CTA

Each step has its own component in `src/components/purchase/`. A `<Stepper>` shows progress with springs and gradient fills.

## Production checklist

- [ ] Validate Telegram `initData` HMAC server-side before trusting user identity (`/api/auth/me`).
- [ ] Issue the `tg_id` cookie that `middleware.ts` reads after verification.
- [ ] Persist orders / users / subscriptions / servers in PostgreSQL.
- [ ] Connect order approval to Marzban (or similar) VPN provisioner.
- [ ] Add rate limiting on order creation and payment marking.
- [ ] Configure `ADMIN_ALLOWED_TELEGRAM_IDS` in production env.

— _Discretion, by design._
