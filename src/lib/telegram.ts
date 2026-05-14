"use client";

import type { TelegramUser } from "@/types";

/**
 * Telegram event names we listen to. The WebApp emits more, but these are
 * the only ones we wire up — keeps the surface explicit.
 */
export type TgEvent =
  | "viewportChanged"
  | "themeChanged"
  | "backButtonClicked"
  | "mainButtonClicked";

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    auth_date?: number;
    hash?: string;
    query_id?: string;
  };
  version: string;
  colorScheme: "light" | "dark";
  themeParams: Record<string, string>;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    setText: (t: string) => void;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
  expand: () => void;
  close: () => void;
  ready: () => void;
  openLink: (url: string) => void;
  openTelegramLink: (url: string) => void;
  showAlert: (msg: string, cb?: () => void) => void;
  showConfirm: (msg: string, cb?: (ok: boolean) => void) => void;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  onEvent: (event: TgEvent, cb: (...args: unknown[]) => void) => void;
  offEvent: (event: TgEvent, cb: (...args: unknown[]) => void) => void;
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

export function getTelegram(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

/**
 * Idempotent. Called from every shell mount; subsequent calls inside the
 * same WebView session no-op cheaply (Telegram silently dedupes `ready`,
 * `expand`, and setHeader/Background calls when the value is unchanged).
 *
 * Also seeds the `--tg-viewport-*` CSS variables that the rest of the app
 * uses for keyboard-aware layouts. The hook `useTelegramViewport` keeps
 * those variables fresh as the viewport changes.
 */
export function initTelegram() {
  const tg = getTelegram();
  if (!tg) return null;
  try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor("#050506");
    tg.setBackgroundColor("#050506");
    syncViewportCssVars(tg);
  } catch {}
  return tg;
}

/**
 * Write the current viewport heights into CSS custom properties so layouts
 * can use `var(--tg-viewport-stable-height)` instead of `100dvh` on
 * Telegram (where dvh is unreliable when the in-app keyboard opens).
 */
export function syncViewportCssVars(tg: TelegramWebApp = getTelegram()!) {
  if (typeof document === "undefined" || !tg) return;
  const root = document.documentElement;
  root.style.setProperty("--tg-viewport-height", `${tg.viewportHeight}px`);
  root.style.setProperty(
    "--tg-viewport-stable-height",
    `${tg.viewportStableHeight}px`,
  );
}

export function haptic(
  type:
    | "light"
    | "medium"
    | "heavy"
    | "soft"
    | "success"
    | "error"
    | "warning"
    | "selection",
) {
  const tg = getTelegram();
  if (!tg) return;
  try {
    if (type === "success" || type === "error" || type === "warning") {
      tg.HapticFeedback.notificationOccurred(type);
    } else if (type === "selection") {
      tg.HapticFeedback.selectionChanged();
    } else {
      tg.HapticFeedback.impactOccurred(type);
    }
  } catch {}
}

export function openExternal(url: string) {
  const tg = getTelegram();
  if (tg) {
    tg.openLink(url);
  } else if (typeof window !== "undefined") {
    window.open(url, "_blank");
  }
}

export function openTelegram(url: string) {
  const tg = getTelegram();
  if (tg) {
    tg.openTelegramLink(url);
  } else if (typeof window !== "undefined") {
    window.open(url, "_blank");
  }
}
