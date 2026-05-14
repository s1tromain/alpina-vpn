"use client";

import { create } from "zustand";
import type { Subscription, User } from "@/types";
import { api, ApiError, setUnauthorizedHandler } from "@/lib/api";
import { clearToken, getToken, setToken } from "@/lib/auth";
import { getTelegram } from "@/lib/telegram";

/**
 * Centralized 401 recovery. Registered once at module-load: any request
 * that comes back unauthorized drops the cached JWT and re-runs the
 * cold-start handshake. Every page benefits — none has to handle 401
 * itself.
 *
 * Guarded against module HMR by setting the handler unconditionally;
 * subsequent imports overwrite the same single slot in the api module.
 */
if (typeof window !== "undefined") {
  setUnauthorizedHandler(() => {
    clearToken();
    // Re-hydrate. The store is created lazily; `useUserStore.getState()`
    // is safe to call here.
    void useUserStore.getState().hydrate();
  });
}

/**
 * Authenticated session state. `hydrate()` runs the cold-start auth
 * handshake (POST /auth/telegram with initData → JWT) and loads the user
 * profile + current subscription. Designed to be idempotent: calling it
 * twice is a no-op while a load is already in flight.
 *
 *  - `user.subscription` mirrors `subscription` for convenience but the
 *    canonical source of truth for the subscription is this slot, since
 *    it's updated after the order-approval round-trip without re-fetching
 *    the whole profile.
 *  - We deliberately do NOT throw from `hydrate()`. Errors are captured
 *    on `error` so the UI can show a friendly retry surface without
 *    React boundaries firing.
 */
interface UserState {
  user: User | null;
  subscription: Subscription | null;
  loading: boolean;
  error: ApiError | null;

  hydrate: () => Promise<void>;
  setUser: (u: User | null) => void;
  setSubscription: (s: Subscription | null) => void;
  refreshSubscription: () => Promise<void>;
  signOut: () => void;
}

let inflight: Promise<void> | null = null;

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  subscription: null,
  loading: true,
  error: null,

  hydrate: () => {
    // Single-flight: concurrent callers attach to the same promise so we
    // never duplicate the network round-trip on first paint.
    if (inflight) return inflight;
    if (get().user) {
      // Already hydrated — short-circuit cheaply.
      set({ loading: false });
      return Promise.resolve();
    }

    set({ loading: true, error: null });

    inflight = (async () => {
      try {
        if (getToken()) {
          try {
            const me = await api.users.me();
            set({
              user: me,
              subscription: me.subscription ?? null,
              loading: false,
              error: null,
            });
            return;
          } catch (err) {
            if (err instanceof ApiError && err.status === 401) {
              clearToken();
              // fall through and re-auth
            } else {
              throw err;
            }
          }
        }

        const tg = getTelegram();
        const initData = tg?.initData ?? "";
        if (!initData) {
          throw new ApiError(
            0,
            "TELEGRAM_UNAVAILABLE",
            "Open this app from Telegram to continue",
          );
        }

        const { token, user } = await api.auth.telegram(initData);
        setToken(token);
        set({
          user,
          subscription: user.subscription ?? null,
          loading: false,
          error: null,
        });
      } catch (err) {
        const apiErr =
          err instanceof ApiError
            ? err
            : new ApiError(0, "BOOTSTRAP_FAILED", (err as Error).message);
        set({ loading: false, error: apiErr });
      } finally {
        inflight = null;
      }
    })();

    return inflight;
  },

  setUser: (user) =>
    set({
      user,
      subscription: user?.subscription ?? null,
      loading: false,
    }),

  setSubscription: (subscription) => {
    set({ subscription });
    const u = get().user;
    if (u) set({ user: { ...u, subscription } });
  },

  refreshSubscription: async () => {
    const subscription = await api.users.subscription();
    get().setSubscription(subscription);
  },

  signOut: () => {
    clearToken();
    inflight = null;
    set({ user: null, subscription: null, loading: false, error: null });
  },
}));
