"use client";

import { useEffect, useState } from "react";
import { initTelegram, getTelegram } from "@/lib/telegram";
import type { TelegramUser } from "@/types";

type TgWebApp = ReturnType<typeof getTelegram>;

/**
 * Single source of truth for Telegram WebApp access inside React.
 *
 * SSR-safe contract:
 *   - On the server and during the first client render this hook returns
 *     `{ ready: false, user: null, tg: null }` regardless of whether the
 *     Telegram script has already attached `window.Telegram.WebApp`. This
 *     guarantees the first client render matches the server HTML and
 *     eliminates hydration warnings.
 *   - On mount the effect calls `initTelegram()` (which itself guards
 *     `typeof window`), captures the user and the WebApp reference into
 *     state, and triggers a normal post-hydration re-render.
 */
export function useTelegram() {
  const [state, setState] = useState<{
    ready: boolean;
    user: TelegramUser | null;
    tg: TgWebApp;
  }>({ ready: false, user: null, tg: null });

  useEffect(() => {
    const tg = initTelegram();
    const user = tg?.initDataUnsafe.user ?? null;
    setState({ ready: true, user, tg });
  }, []);

  return state;
}
