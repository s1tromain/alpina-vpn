"use client";

import { create } from "zustand";
import type { User } from "@/types";
import { api, ApiError } from "@/lib/api";
import { useUserStore } from "@/stores/user-store";

/**
 * Web admin panel session — independent of the Telegram Mini App flow.
 *
 * Authentication is username/password against the Fastify backend, which
 * issues an HttpOnly session cookie. There is no token in JS to manage; we
 * just track whether `GET /auth/admin/me` succeeds.
 *
 * We bridge the resolved user into the shared `useUserStore` so the existing
 * admin pages — which gate their authenticated fetches on `useUserStore.user`
 * via `useResource` / `useAuthedEffect` — keep working unchanged. Those
 * fetches ride the same cookie (credentials: "include"), so no JWT is needed
 * client-side.
 */
interface AdminState {
  admin: User | null;
  loading: boolean;
  error: string | null;

  hydrate: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAdminStore = create<AdminState>((set) => ({
  admin: null,
  loading: true,
  error: null,

  hydrate: async () => {
    set({ loading: true, error: null });
    try {
      const me = await api.auth.adminMe();
      useUserStore.getState().setUser(me);
      set({ admin: me, loading: false, error: null });
    } catch (err) {
      useUserStore.getState().setUser(null);
      set({
        admin: null,
        loading: false,
        error: err instanceof ApiError ? err.message : "Not authenticated",
      });
    }
  },

  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const { user } = await api.auth.adminLogin(username, password);
      useUserStore.getState().setUser(user);
      set({ admin: user, loading: false, error: null });
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Login failed";
      set({ loading: false, error: message });
      throw err;
    }
  },

  logout: async () => {
    try {
      await api.auth.adminLogout();
    } catch {
      /* clearing client state regardless */
    }
    useUserStore.getState().signOut();
    set({ admin: null, loading: false, error: null });
  },
}));
