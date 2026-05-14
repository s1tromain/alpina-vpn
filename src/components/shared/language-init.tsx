"use client";

import { useEffect } from "react";
import { useLanguageStore } from "@/stores/language-store";

/**
 * Runs once on app mount: reconciles persisted language and Telegram's
 * `language_code`. After this fires, every `useTranslations` consumer
 * re-renders with the actual user language.
 */
export function LanguageInit() {
  const hydrate = useLanguageStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return null;
}
