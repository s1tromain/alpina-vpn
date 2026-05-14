"use client";

import { useMounted } from "@/hooks/use-mounted";
import { useLanguage, format as interpolate } from "@/hooks/use-translations";
import { ru } from "@/locales/ru";
import { en } from "@/locales/en";

const dicts = { ru, en };

/**
 * Localized formatters bound to the current UI language.
 *
 * SSR/hydration safety:
 *   - `useLanguage()` returns "ru" until the language store has hydrated
 *     client-side, so date/currency output is byte-identical between the
 *     server render and the first client render.
 *   - Time-relative helpers (`relativeTime`, `daysUntil`) read `Date.now()`,
 *     which differs server vs client. They are gated by `useMounted` and
 *     return a stable fallback (an absolute date, or `0`) until mount.
 */
export function useFormatters() {
  const lang = useLanguage();
  const mounted = useMounted();
  const locale = lang === "ru" ? "ru-RU" : "en-US";
  const dict = dicts[lang] ?? dicts.ru;

  const formatDate = (iso: string, opts?: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      ...opts,
    }).format(new Date(iso));

  const formatDateTime = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: lang === "en",
    }).format(new Date(iso));

  // Currency is intentionally locked to en-US — premium pricing reads as
  // "$15" everywhere, regardless of UI language. This keeps the marketing
  // and order tables visually consistent across locales.
  const formatCurrency = (amount: number, currency = "USD") =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);

  const relativeTime = (iso: string) => {
    if (!mounted) return formatDate(iso);
    const diff = Date.now() - new Date(iso).getTime();
    const sec = Math.floor(diff / 1000);
    if (sec < 5) return dict.relativeTime.justNow;
    if (sec < 60) return interpolate(dict.relativeTime.secondsAgo, { n: sec });
    const min = Math.floor(sec / 60);
    if (min === 1) return dict.relativeTime.minuteAgo;
    if (min < 60) return interpolate(dict.relativeTime.minutesAgo, { n: min });
    const hr = Math.floor(min / 60);
    if (hr === 1) return dict.relativeTime.hourAgo;
    if (hr < 24) return interpolate(dict.relativeTime.hoursAgo, { n: hr });
    const d = Math.floor(hr / 24);
    if (d === 1) return dict.relativeTime.dayAgo;
    if (d < 30) return interpolate(dict.relativeTime.daysAgo, { n: d });
    const mo = Math.floor(d / 30);
    return interpolate(dict.relativeTime.monthsAgo, { n: mo });
  };

  const daysUntil = (iso: string) => {
    if (!mounted) return 0;
    const ms = new Date(iso).getTime() - Date.now();
    return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  };

  return {
    locale,
    formatDate,
    formatDateTime,
    formatCurrency,
    relativeTime,
    daysUntil,
  };
}
