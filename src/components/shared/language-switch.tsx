"use client";

import { motion } from "framer-motion";
import { useLanguageStore } from "@/stores/language-store";
import { useTranslations } from "@/hooks/use-translations";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/utils";

const options = ["ru", "en"] as const;

export function LanguageSwitch() {
  const t = useTranslations();
  const language = useLanguageStore((s) =>
    s._hydrated ? s.language : ("ru" as const),
  );
  const setLanguage = useLanguageStore((s) => s.setLanguage);

  return (
    <div
      role="radiogroup"
      aria-label={t.language.label}
      className="relative inline-flex items-center rounded-full border border-white/10 bg-white/[0.03] p-0.5 backdrop-blur-xl"
    >
      {options.map((opt) => {
        const active = opt === language;
        return (
          <button
            key={opt}
            role="radio"
            aria-checked={active}
            onClick={() => {
              if (active) return;
              haptic("selection");
              setLanguage(opt);
            }}
            className={cn(
              "relative z-10 inline-flex h-7 min-w-[44px] items-center justify-center rounded-full px-3 text-[10px] font-medium uppercase tracking-[0.22em] transition-colors",
              active
                ? "text-graphite-950"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {active && (
              <motion.span
                layoutId="lang-thumb"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
                className="absolute inset-0 -z-10 rounded-full bg-gradient-to-b from-white to-silver-light shadow-[inset_0_-1px_0_rgba(0,0,0,0.15),0_4px_12px_-4px_rgba(255,255,255,0.25)]"
              />
            )}
            {t.language[opt]}
          </button>
        );
      })}
    </div>
  );
}
