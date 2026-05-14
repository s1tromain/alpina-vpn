"use client";

import { useEffect } from "react";
import { useLanguage } from "@/hooks/use-translations";

/**
 * Keeps `<html lang>` in sync with the active UI language.
 *
 * The server renders `lang="ru"` (the default until the language store
 * has hydrated) so the initial server/client markup matches. Once
 * `useLanguage()` returns the user's actual preference we update the
 * attribute imperatively — this avoids triggering a hydration warning
 * and gives screen readers the right BCP-47 tag.
 */
export function HtmlLangSync() {
  const lang = useLanguage();

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.documentElement.lang !== lang) {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  return null;
}
