"use client";

/**
 * Frontend auth state — JWT obtained from POST /auth/telegram.
 *
 * Storage: localStorage. Telegram Mini Apps run inside a WebView with full
 * localStorage support, and the token is short-lived (7d default per backend
 * config). If you need stronger expiry guarantees, gate reads on the `exp`
 * claim.
 *
 * No external pub/sub: tokens are only consumed at fetch time by the API
 * client, so callers don't need to subscribe to mutations.
 */

const TOKEN_KEY = "alpinavpn:jwt";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* private mode / quota — fail silently, requests will fall back to initData */
  }
}

export function clearToken() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* noop */
  }
}
