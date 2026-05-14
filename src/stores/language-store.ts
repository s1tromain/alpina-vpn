"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getTelegram } from "@/lib/telegram";

export type Language = "ru" | "en";

interface State {
  language: Language;
  /** Flipped to true only after the client mounts and (a) reads persisted choice
   *  or (b) auto-detects from Telegram. Used to avoid SSR / first-render
   *  hydration mismatches: every consumer renders as `ru` (default) until this
   *  becomes true, then re-renders with the actual language. */
  _hydrated: boolean;
  setLanguage: (l: Language) => void;
  hydrate: () => void;
}

function detectFromTelegram(): Language | null {
  const tg = getTelegram();
  const code = tg?.initDataUnsafe.user?.language_code;
  if (!code) return null;
  return code.toLowerCase().startsWith("ru") ? "ru" : "en";
}

export const useLanguageStore = create<State>()(
  persist(
    (set, get) => ({
      language: "ru",
      _hydrated: false,
      setLanguage: (l) => set({ language: l, _hydrated: true }),
      hydrate: () => {
        if (get()._hydrated) return;
        // Persist middleware has already restored `language` from localStorage
        // (if any). If localStorage was empty and we still have the default,
        // we may want to override via Telegram detection.
        const persistedHasLang =
          typeof window !== "undefined" &&
          !!window.localStorage.getItem("alpinavpn:lang");

        if (!persistedHasLang) {
          const tg = detectFromTelegram();
          if (tg) {
            set({ language: tg, _hydrated: true });
            return;
          }
        }
        set({ _hydrated: true });
      },
    }),
    {
      name: "alpinavpn:lang",
      partialize: (s) => ({ language: s.language }) as Partial<State>,
    },
  ),
);
