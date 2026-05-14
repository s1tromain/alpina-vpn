"use client";

import { useEffect } from "react";
import { getTelegram, syncViewportCssVars } from "@/lib/telegram";

/**
 * Keeps `--tg-viewport-height` and `--tg-viewport-stable-height` CSS
 * variables in sync with Telegram's reported viewport.
 *
 * Why this matters:
 *   - On iOS, opening the in-app keyboard shrinks viewportHeight but NOT
 *     viewportStableHeight. Using the stable value for full-bleed layouts
 *     prevents content from "jumping" as the keyboard animates.
 *   - On Android, the address bar collapse / re-expand also fires this
 *     event; using these CSS variables avoids the dvh layout jitter that
 *     plagues WebView dvh implementations.
 *
 * Mounted once at the shell level — multiple subscribers are harmless,
 * Telegram deduplicates listeners.
 */
export function useTelegramViewport() {
  useEffect(() => {
    const tg = getTelegram();
    if (!tg) return;

    const onChange = () => syncViewportCssVars(tg);
    syncViewportCssVars(tg);
    tg.onEvent("viewportChanged", onChange);
    return () => {
      try {
        tg.offEvent("viewportChanged", onChange);
      } catch {
        /* noop */
      }
    };
  }, []);
}
