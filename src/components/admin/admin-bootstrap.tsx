"use client";

import { useEffect } from "react";
import { useTelegram } from "@/hooks/use-telegram";
import { useTelegramViewport } from "@/hooks/use-telegram-viewport";
import { useTelegramTheme } from "@/hooks/use-telegram-theme";
import { useTelegramBack } from "@/hooks/use-telegram-back";
import { useUserStore } from "@/stores/user-store";
import { BrandSplash } from "@/components/layout/brand-splash";

/**
 * Mounted by the admin layout to drive the same auth handshake the Mini
 * App's AppShell runs — admin pages don't go through AppShell, so without
 * this they'd issue requests with no JWT and bounce on 401.
 *
 * Also runs the Telegram viewport / theme / back-button hooks for the
 * admin tree, since operators may open the panel via Telegram. The
 * back button is shown on every admin page (no "home" carve-out).
 */
export function AdminBootstrap() {
  useTelegram();
  useTelegramViewport();
  useTelegramTheme();
  useTelegramBack(undefined, { showOnHome: true });

  const hydrate = useUserStore((s) => s.hydrate);
  const loading = useUserStore((s) => s.loading);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return <BrandSplash show={loading} />;
}
