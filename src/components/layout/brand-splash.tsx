"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/stores/user-store";
import { useTranslations } from "@/hooks/use-translations";
import { BrandLockup, BrandSpinner } from "@/components/layout/brand";

/**
 * Cold-start splash. Renders the brand lockup over the app background
 * while `useUserStore.hydrate()` is in flight, so the user sees Alpina
 * instead of a half-painted shell or a white flash.
 *
 * Three states it can render:
 *   - loading           : brand lockup + spinner
 *   - error (bootstrap) : brand lockup + apology message + Retry CTA
 *   - hidden            : full-opacity fade out, then unmounts
 *
 * `minDurationMs` keeps the splash up for at least that long even if
 * hydration finishes faster — prevents the splash from "blinking" on
 * fast networks.
 */
export function BrandSplash({
  show,
  minDurationMs = 350,
}: {
  show: boolean;
  minDurationMs?: number;
}) {
  const t = useTranslations();
  const error = useUserStore((s) => s.error);
  const hydrate = useUserStore((s) => s.hydrate);

  const [mounted, setMounted] = useState(true);
  const [mountedAt] = useState(() => Date.now());

  const visible = show || !!error;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      return;
    }
    const elapsed = Date.now() - mountedAt;
    const remaining = Math.max(0, minDurationMs - elapsed);
    const tm = setTimeout(() => setMounted(false), remaining);
    return () => clearTimeout(tm);
  }, [visible, mountedAt, minDurationMs]);

  if (!mounted) return null;

  return (
    <div
      aria-hidden={!visible}
      role={error ? "alert" : "status"}
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-gradient-alpine-ambient transition-opacity duration-300 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex flex-col items-center gap-8 px-6 text-center">
        <BrandLockup />
        {error ? (
          <div className="flex flex-col items-center gap-4">
            <p className="max-w-xs text-sm text-muted-foreground">
              {error.code === "TELEGRAM_UNAVAILABLE"
                ? t.bootstrap.openInTelegram
                : t.bootstrap.failedRetry}
            </p>
            <button
              type="button"
              onClick={() => void hydrate()}
              className="rounded-full border border-white/15 bg-white/[0.04] px-5 py-2 text-xs font-medium uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-white/[0.08]"
            >
              {t.common.retry}
            </button>
          </div>
        ) : (
          <BrandSpinner size={20} />
        )}
      </div>
    </div>
  );
}
