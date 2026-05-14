"use client";

import { useEffect } from "react";
import { useUserStore } from "@/stores/user-store";
import { useTelegram } from "@/hooks/use-telegram";
import { useTelegramBack } from "@/hooks/use-telegram-back";
import { useTelegramViewport } from "@/hooks/use-telegram-viewport";
import { useTelegramTheme } from "@/hooks/use-telegram-theme";
import { BottomNav } from "@/components/layout/bottom-nav";
import { BrandSplash } from "@/components/layout/brand-splash";

/**
 * Mini App root shell. Three responsibilities:
 *
 *   1. Initialize Telegram WebApp (ready/expand/colors) and subscribe to
 *      viewport + theme changes via the dedicated hooks.
 *   2. Drive the auth handshake on cold start; show the brand splash
 *      while it runs so the user never sees a half-painted shell.
 *   3. Render the tab content + bottom nav with safe-area padding.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  useTelegram();
  useTelegramViewport();
  useTelegramTheme();
  useTelegramBack(); // hidden on root tabs by default; auto-shows elsewhere
  const hydrate = useUserStore((s) => s.hydrate);
  const loading = useUserStore((s) => s.loading);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  return (
    <>
      <BrandSplash show={loading} />
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col px-4 pt-3 pb-28">
        {children}
        <BottomNav />
      </div>
    </>
  );
}
