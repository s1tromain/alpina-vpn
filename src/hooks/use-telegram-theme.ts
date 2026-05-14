"use client";

import { useEffect } from "react";
import { getTelegram } from "@/lib/telegram";

/**
 * Re-applies the brand header / background colours whenever Telegram
 * reports a theme change.
 *
 * Alpina is a dark-only product, so we don't actually switch palettes
 * with the user's light/dark preference — but Telegram occasionally
 * resets `headerColor` on its own (e.g. when the WebView is restored
 * from background). Without this, the header briefly flashes back to
 * Telegram's default blue. This handler clamps it back to brand graphite.
 */
export function useTelegramTheme(headerColor = "#050506", backgroundColor = "#050506") {
  useEffect(() => {
    const tg = getTelegram();
    if (!tg) return;

    const apply = () => {
      try {
        tg.setHeaderColor(headerColor);
        tg.setBackgroundColor(backgroundColor);
      } catch {
        /* tg might be in an odd state during teardown */
      }
    };

    apply();
    tg.onEvent("themeChanged", apply);
    return () => {
      try {
        tg.offEvent("themeChanged", apply);
      } catch {
        /* noop */
      }
    };
  }, [headerColor, backgroundColor]);
}
