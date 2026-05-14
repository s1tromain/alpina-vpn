"use client";

import { useLanguageStore } from "@/stores/language-store";
import { ru, type Dict } from "@/locales/ru";
import { en } from "@/locales/en";

const dicts: Record<"ru" | "en", Dict> = { ru, en };

/**
 * Returns the active translation dictionary. Until the language store has
 * hydrated client-side, this returns the RU dictionary to keep server-rendered
 * markup matching the first client render — eliminating hydration warnings.
 *
 * Usage:
 *   const t = useTranslations();
 *   t.nav.home // "Главная"
 */
export function useTranslations(): Dict {
  const lang = useLanguageStore((s) =>
    s._hydrated ? s.language : ("ru" as const),
  );
  return dicts[lang] ?? dicts.ru;
}

export function useLanguage() {
  return useLanguageStore((s) => (s._hydrated ? s.language : ("ru" as const)));
}

/**
 * Substitute `{token}` placeholders. Falls back to the raw token if a value
 * is missing — preserves the surrounding string instead of silently dropping.
 */
export function format(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] !== undefined ? String(vars[key]) : `{${key}}`,
  );
}
