"use client";

import { motion } from "framer-motion";
import { Country } from "@/types";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/telegram";
import { useVpnStore } from "@/stores/vpn-store";
import { useTranslations, format } from "@/hooks/use-translations";

interface Props {
  countries: Country[];
}

export function CountriesRow({ countries }: Props) {
  const t = useTranslations();
  const { selectedCountry, setCountry } = useVpnStore();

  return (
    <div className="-mx-4 overflow-x-auto no-scrollbar">
      <div className="flex gap-2 px-4">
        {countries.map((c, idx) => {
          const active = selectedCountry === c.code;
          const localizedName =
            (t.countries as Record<string, string>)[c.code] ?? c.name;
          return (
            <motion.button
              key={c.code}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.03, duration: 0.35 }}
              onClick={() => {
                haptic("selection");
                setCountry(c.code);
              }}
              className={cn(
                "group relative flex min-w-[112px] flex-col items-start gap-2 rounded-2xl border px-3 py-3 text-left transition-all",
                active
                  ? "border-white/15 bg-white/[0.05]"
                  : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]",
              )}
            >
              <div className="flex w-full items-center justify-between">
                <span className="text-xl leading-none">{c.flag}</span>
                {c.premium && (
                  <span className="text-[8px] font-medium uppercase tracking-wider text-silver">
                    {t.countries.premier}
                  </span>
                )}
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium leading-none">{localizedName}</p>
                <p className="text-[10px] text-muted-foreground">
                  {format(t.common.pingMs, { n: c.ping })} ·{" "}
                  {format(t.common.loadPct, { n: c.load })}
                </p>
              </div>
              {active && (
                <motion.span
                  layoutId="country-ring"
                  className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/20"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
