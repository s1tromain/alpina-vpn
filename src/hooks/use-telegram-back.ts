"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getTelegram, haptic } from "@/lib/telegram";

/**
 * Wires the Telegram native BackButton to a callback for as long as this
 * hook is mounted. Outside Telegram, this is a cheap no-op.
 *
 *   - Pass `onBack` for custom behaviour (close modal, step back in a wizard).
 *   - Pass no argument to use the default: `router.back()` if there's a
 *     history entry, else navigate to "/" — never leave the user stranded
 *     on a back-less page.
 *
 * The button is hidden on /, /vpn, /profile, /orders (root tabs) so a tap
 * doesn't close the app accidentally. Override by passing `showOnHome: true`.
 */
export function useTelegramBack(
  onBack?: () => void,
  opts: { showOnHome?: boolean } = {},
) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const tg = getTelegram();
    if (!tg) return;

    const isTab =
      pathname === "/" ||
      pathname === "/vpn" ||
      pathname === "/orders" ||
      pathname === "/profile";

    if (isTab && !opts.showOnHome) {
      tg.BackButton.hide();
      return;
    }

    const handler = () => {
      haptic("light");
      if (onBack) {
        onBack();
      } else if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
      } else {
        router.push("/");
      }
    };

    tg.BackButton.onClick(handler);
    tg.BackButton.show();

    return () => {
      try {
        tg.BackButton.offClick(handler);
        tg.BackButton.hide();
      } catch {
        /* tg may have torn down */
      }
    };
  }, [pathname, onBack, opts.showOnHome, router]);
}
