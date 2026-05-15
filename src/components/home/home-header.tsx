"use client";

import { motion } from "framer-motion";
import { Bell, ShieldCheck, ShieldOff } from "lucide-react";
import { BrandWordmark } from "@/components/layout/brand";
import { useUserStore } from "@/stores/user-store";
import { useTranslations, format } from "@/hooks/use-translations";
import { useFormatters } from "@/hooks/use-formatters";
import { cn } from "@/lib/utils";

export function HomeHeader() {
  const t = useTranslations();
  const { daysUntil } = useFormatters();
  const subscription = useUserStore((s) => s.subscription);
  const active = subscription?.status === "active";

  const localizedCountry = subscription
    ? (t.countries as Record<string, string>)[subscription.country.code] ??
      subscription.country.name
    : null;

  const daysLeft = subscription ? daysUntil(subscription.expiresAt) : 0;

  return (
    <section className="relative">
      <div className="flex items-center justify-between">
        <BrandWordmark tagline={false} />
        <button
          aria-label={t.common.notifications}
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-muted-foreground transition-colors hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-silver-light shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="mt-5 flex items-center gap-2"
      >
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em]",
            active
              ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
              : "border-white/10 bg-white/[0.03] text-muted-foreground",
          )}
        >
          <span className="relative inline-flex h-1.5 w-1.5">
            <span
              className={cn(
                "absolute inset-0 rounded-full",
                active ? "bg-emerald-400" : "bg-muted-foreground/60",
              )}
            />
            {active && (
              <span className="absolute inset-0 animate-pulse-ring rounded-full bg-emerald-400/40" />
            )}
          </span>
          {active ? (
            <>
              <ShieldCheck className="h-3 w-3" />
              {t.homeHeader.protected}
            </>
          ) : (
            <>
              <ShieldOff className="h-3 w-3" />
              {t.homeHeader.inactive}
            </>
          )}
        </span>

        {subscription && (
          <span className="inline-flex items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[10px] font-medium text-muted-foreground">
            <span className="text-sm leading-none">
              {subscription.country.flag}
            </span>
            <span className="uppercase tracking-[0.12em]">
              {localizedCountry}
            </span>
          </span>
        )}

        {subscription && (
          <span className="ml-auto text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {format(t.homeHeader.daysLeft, { n: daysLeft })}
          </span>
        )}
      </motion.div>
    </section>
  );
}
