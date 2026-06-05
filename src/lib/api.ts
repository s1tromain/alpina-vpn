/**
 * Typed API client. Talks to the Fastify backend over /api.
 *
 *   Resolution order for the base URL:
 *     1. `NEXT_PUBLIC_API_URL` (e.g. "https://api.alpinavpn.example")
 *     2. Empty string — meaning same-origin, paired with the Next.js
 *        rewrite rule in `next.config.js` that proxies /api/* to the
 *        backend during development.
 *
 *   Auth header precedence (matches backend's `authenticate` plugin):
 *     1. `Authorization: Bearer <jwt>`     — preferred once we've logged in
 *     2. `X-Telegram-Init-Data: <raw>`     — fallback on cold start before
 *                                            POST /auth/telegram has run
 *
 *   Cross-cutting behaviour:
 *     - 8 s default timeout (override per-call via `timeoutMs`).
 *     - Caller-supplied `AbortSignal` is honoured AND chained with the
 *       internal timeout signal — whichever fires first cancels the fetch.
 *     - On 401 we invoke a single `onUnauthorized` callback (wired by
 *       `useUserStore`) so every page sheds the stale JWT in one place
 *       instead of each consumer rolling its own clearToken / re-login.
 *
 *   Errors are normalized to `ApiError` carrying `{status, code, details}`
 *   from the backend's centralized error handler.
 */

import type {
  AdminStats,
  Country,
  Order,
  OrderNoteKey,
  OrderStatus,
  PaymentRequisite,
  Plan,
  ReceiptSummary,
  Subscription,
  User,
  VPNServer,
} from "@/types";
import { getToken } from "./auth";

const BASE_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");
const DEFAULT_TIMEOUT_MS = 8_000;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOpts extends Omit<RequestInit, "body"> {
  /** JSON-serializable body. Stringified for you. */
  json?: unknown;
  /** Raw initData fallback when no JWT is available yet. */
  telegramInitData?: string;
  /** Optional AbortSignal — chained with the internal timeout. */
  signal?: AbortSignal;
  /** Override the default 8 s timeout for this call. */
  timeoutMs?: number;
  /** Suppress the global 401 handler (e.g. for the auth handshake itself). */
  skipUnauthorizedHandler?: boolean;
}

// ── Global 401 handler ─────────────────────────────────────────────────────
// Registered once by `useUserStore`. Centralizes "JWT is stale" recovery.

type UnauthorizedHandler = (err: ApiError) => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(fn: UnauthorizedHandler | null) {
  unauthorizedHandler = fn;
}

// ── Internal request runner ────────────────────────────────────────────────

async function request<T>(path: string, opts: RequestOpts = {}): Promise<T> {
  const headers = new Headers(opts.headers);
  if (opts.json !== undefined) headers.set("Content-Type", "application/json");

  const token = getToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  } else if (opts.telegramInitData) {
    headers.set("X-Telegram-Init-Data", opts.telegramInitData);
  }

  const url = `${BASE_URL}/api${path}`;

  // Chain caller-supplied signal with our timeout. If the caller's signal
  // is already aborted we short-circuit before fetching at all.
  if (opts.signal?.aborted) {
    throw new ApiError(0, "ABORTED", "Request aborted");
  }
  const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  const onCallerAbort = () => ac.abort();
  opts.signal?.addEventListener("abort", onCallerAbort, { once: true });

  let res: Response;
  try {
    res = await fetch(url, {
      ...opts,
      headers,
      body: opts.json !== undefined ? JSON.stringify(opts.json) : undefined,
      credentials: "include",
      signal: ac.signal,
    });
  } catch (err) {
    // Distinguish three failure modes that look the same from fetch's POV.
    if (ac.signal.aborted) {
      // Caller-driven OR our timeout — collapse into one error code.
      const code = opts.signal?.aborted ? "ABORTED" : "TIMEOUT";
      throw new ApiError(0, code, `Request ${code.toLowerCase()}`);
    }
    throw new ApiError(
      0,
      "NETWORK_ERROR",
      err instanceof Error ? err.message : "Network request failed",
    );
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onCallerAbort);
  }

  if (res.status === 204) return undefined as T;

  // The backend always sends JSON, even for errors. If we get something
  // else (e.g. an nginx 502 HTML page) we treat the body as an opaque blob.
  let payload: unknown;
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    payload = await res.json().catch(() => null);
  } else {
    payload = await res.text().catch(() => null);
  }

  if (!res.ok) {
    const errPayload = (payload ?? {}) as Partial<{
      error: string;
      message: string;
      details: unknown;
    }>;
    const err = new ApiError(
      res.status,
      errPayload.error ?? "UNKNOWN",
      errPayload.message ?? res.statusText,
      errPayload.details,
    );
    if (res.status === 401 && !opts.skipUnauthorizedHandler) {
      try {
        unauthorizedHandler?.(err);
      } catch {
        /* keep the original error path */
      }
    }
    throw err;
  }

  return payload as T;
}

// ── Login response shape ────────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  isNewUser: boolean;
  user: User;
}

// ── Endpoint surface ────────────────────────────────────────────────────────

export const api = {
  auth: {
    /** Exchange Telegram initData for a JWT. Must be called once on cold start. */
    telegram: (initData: string) =>
      request<LoginResponse>("/auth/telegram", {
        method: "POST",
        json: { initData },
        telegramInitData: initData,
        // We're already handling auth here — don't recurse via the 401 hook.
        skipUnauthorizedHandler: true,
      }),
    me: (initData?: string) =>
      request<User>("/auth/me", { telegramInitData: initData }),

    /**
     * Web admin panel (browser, outside Telegram). Credentials are sent with
     * `credentials: "include"` and the backend replies with an HttpOnly
     * session cookie — the SPA never sees the raw JWT.
     */
    adminLogin: (username: string, password: string) =>
      request<{ user: User }>("/auth/admin/login", {
        method: "POST",
        json: { username, password },
        skipUnauthorizedHandler: true,
      }),
    adminLogout: () =>
      request<{ ok: true }>("/auth/admin/logout", {
        method: "POST",
        skipUnauthorizedHandler: true,
      }),
    adminMe: () =>
      request<User>("/auth/admin/me", { skipUnauthorizedHandler: true }),
  },

  users: {
    me: () => request<User>("/users/me"),
    orders: () => request<Order[]>("/users/me/orders"),
    subscription: () => request<Subscription | null>("/users/me/subscription"),
  },

  subscriptions: {
    me: () => request<Subscription | null>("/subscriptions/me"),
  },

  orders: {
    mine: () => request<Order[]>("/orders"),
    get: (id: string) => request<Order>(`/orders/${encodeURIComponent(id)}`),
    // The backend pins region + payment card automatically; the user only
    // chooses a plan. Creates the order in the `created` state.
    create: (body: { planId: string }) => {
      // Diagnostic: trace the order POST so a missing request is obvious in
      // the browser console (root-caused a "purchase does nothing" report).
      console.info("[purchase] api.orders.create → POST /api/orders", body);
      return request<Order>("/orders", { method: "POST", json: body }).then(
        (order) => {
          console.info("[purchase] api.orders.create ✓ created", order.id);
          return order;
        },
        (err) => {
          console.error("[purchase] api.orders.create ✗ failed", err);
          throw err;
        },
      );
    },
    cancel: (orderId: string) =>
      request<Order>(`/orders/${encodeURIComponent(orderId)}/cancel`, {
        method: "POST",
      }),
    /**
     * Upload a payment receipt for an open order. Send a single File/Blob
     * (jpg/png/webp/pdf, ≤8 MiB). Sets order to "processing" and posts the
     * receipt to the operator moderation channel.
     */
    uploadReceipt: async (orderId: string, file: Blob) => {
      const form = new FormData();
      form.append("file", file);
      const token = getToken();
      const headers = new Headers();
      if (token) headers.set("Authorization", `Bearer ${token}`);
      const res = await fetch(
        `${BASE_URL}/api/orders/${encodeURIComponent(orderId)}/receipt`,
        { method: "POST", headers, body: form, credentials: "include" },
      );
      const payload = await res
        .json()
        .catch(() => ({ error: "UNKNOWN", message: res.statusText }));
      if (!res.ok) {
        throw new ApiError(
          res.status,
          (payload as { error?: string }).error ?? "UNKNOWN",
          (payload as { message?: string }).message ?? res.statusText,
          (payload as { details?: unknown }).details,
        );
      }
      return payload as {
        id: string;
        orderId: string;
        mimeType: string;
        sizeBytes: number;
        createdAt: string;
      };
    },
  },

  plans: { list: () => request<Plan[]>("/plans") },
  countries: { list: () => request<Country[]>("/countries") },
  servers: { list: () => request<VPNServer[]>("/vpn/servers") },

  payments: {
    requisites: () => request<PaymentRequisite[]>("/payments/requisites"),
  },

  notifications: {
    list: () =>
      request<
        Array<{
          id: string;
          kind: string;
          titleKey: string;
          bodyKey: string | null;
          payload: unknown;
          readAt: string | null;
          createdAt: string;
        }>
      >("/notifications"),
    unreadCount: () => request<{ count: number }>("/notifications/unread-count"),
    markAllRead: () =>
      request<{ ok: true; updated: number }>("/notifications/read-all", {
        method: "POST",
      }),
    markRead: (id: string) =>
      request<{ ok: true; updated: number }>(
        `/notifications/${encodeURIComponent(id)}/read`,
        { method: "POST" },
      ),
  },

  admin: {
    stats: () => request<AdminStats>("/admin/stats"),
    users: (params?: { skip?: number; take?: number; search?: string }) =>
      request<User[]>(`/admin/users${qs(params)}`),
    orders: (params?: { status?: OrderStatus; skip?: number; take?: number }) =>
      request<Order[]>(`/admin/orders${qs(params)}`),
    setOrderStatus: (
      orderId: string,
      body: { status: OrderStatus; note?: string; noteKey?: OrderNoteKey },
    ) =>
      request<Order>(`/admin/orders/${encodeURIComponent(orderId)}`, {
        method: "PATCH",
        json: body,
      }),
    orderReceipts: (orderId: string) =>
      request<ReceiptSummary[]>(
        `/admin/orders/${encodeURIComponent(orderId)}/receipts`,
      ),
    /**
     * Build an authenticated URL the admin UI can hand to an `<img>` or
     * `<a download>`. We append the JWT as a query parameter so the browser
     * can fetch it without a custom header (CORS pre-flight on `<img>` is
     * impossible). The token has the user's role baked in — the backend
     * still verifies it on every request.
     *
     * For PDF receipts the same URL triggers the file download via the
     * backend's `Content-Disposition: attachment` header.
     */
    receiptFileUrl: (receiptId: string) => {
      const token = getToken();
      const q = token ? `?token=${encodeURIComponent(token)}` : "";
      return `${BASE_URL}/api/admin/receipts/${encodeURIComponent(receiptId)}/file${q}`;
    },
    setUserRole: (
      userId: string,
      role: "user" | "operator" | "admin",
    ) =>
      request<{ id: string; role: string }>(
        `/admin/users/${encodeURIComponent(userId)}/role`,
        { method: "PATCH", json: { role } },
      ),
    setUserBan: (userId: string, banned: boolean, reason?: string) =>
      request<{ id: string; banned: boolean }>(
        `/admin/users/${encodeURIComponent(userId)}/ban`,
        { method: "PATCH", json: { banned, reason } },
      ),
    requisites: {
      list: () => request<PaymentRequisite[]>("/admin/requisites"),
      create: (body: Omit<PaymentRequisite, "id" | "receivedTotalUsd">) =>
        request<PaymentRequisite>("/admin/requisites", {
          method: "POST",
          json: body,
        }),
      update: (
        id: string,
        body: Partial<{
          active: boolean;
          title: string;
          cardNumber: string;
          ownerName: string;
          bankName: string;
          qrImage: string | null;
          instructions: string | null;
        }>,
      ) =>
        request<PaymentRequisite>(`/admin/requisites/${encodeURIComponent(id)}`, {
          method: "PATCH",
          json: body,
        }),
      remove: (id: string) =>
        request<void>(`/admin/requisites/${encodeURIComponent(id)}`, {
          method: "DELETE",
        }),
    },
    plans: {
      list: () => request<Plan[]>("/admin/plans"),
      create: (body: {
        slug: string;
        tier: Plan["tier"];
        label: string;
        priceUsd: number;
        durationDays: number;
        trafficGb: number | null;
        maxDevices: number;
        features: string[];
        badge?: string | null;
        savingsPercent?: number | null;
        active: boolean;
        sortOrder: number;
      }) => request<Plan>("/admin/plans", { method: "POST", json: body }),
      update: (
        id: string,
        body: Partial<{
          slug: string;
          tier: Plan["tier"];
          label: string;
          priceUsd: number;
          durationDays: number;
          trafficGb: number | null;
          maxDevices: number;
          features: string[];
          badge: string | null;
          savingsPercent: number | null;
          active: boolean;
          sortOrder: number;
        }>,
      ) =>
        request<Plan>(`/admin/plans/${encodeURIComponent(id)}`, {
          method: "PATCH",
          json: body,
        }),
    },
  },

  health: {
    db: () =>
      request<{
        status: "ok" | "unhealthy";
        db: { ok: boolean; latencyMs?: number; error?: string };
        uptimeSeconds: number;
        vpnProvider: string;
        timestamp: string;
      }>("/../health/db"),
  },
};

function qs(params?: Record<string, unknown>) {
  if (!params) return "";
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (entries.length === 0) return "";
  const sp = new URLSearchParams();
  for (const [k, v] of entries) sp.set(k, String(v));
  return `?${sp.toString()}`;
}
