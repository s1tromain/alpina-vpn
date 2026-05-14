"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/telegram";
import { Sparkles } from "lucide-react";
import { useTranslations, format } from "@/hooks/use-translations";
import type { Country } from "@/types";

interface Props {
  countries: Country[];
  value: string;
  onChange: (code: string) => void;
}

export function CountryStep({ countries, value, onChange }: Props) {
  const t = useTranslations();
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {countries.map((c) => {
        const active = c.code === value;
        const localizedName =
          (t.countries as Record<string, string>)[c.code] ?? c.name;
        return (
          <motion.button
            key={c.code}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              haptic("selection");
              onChange(c.code);
            }}
            className={cn(
              "relative flex flex-col gap-2 rounded-2xl border p-3.5 text-left transition-all",
              active
                ? "border-white/20 bg-white/[0.06]"
                : "border-white/[0.06] bg-white/[0.02]",
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-2xl leading-none">{c.flag}</span>
              {c.premium && (
                <span className="inline-flex items-center gap-1 rounded-full border border-silver/30 px-1.5 py-0.5 text-[8.5px] font-medium uppercase tracking-wider text-silver-light">
                  <Sparkles className="h-2 w-2" />
                  {t.countries.premier}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-medium leading-tight">{localizedName}</p>
              <p className="text-[10px] text-muted-foreground">
                {format(t.common.pingMs, { n: c.ping })} ·{" "}
                {format(t.common.loadPct, { n: c.load })}
              </p>
            </div>
            {active && (
              <motion.span
                layoutId="country-active"
                className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/25"
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
