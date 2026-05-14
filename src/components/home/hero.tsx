"use client";

import { motion } from "framer-motion";
import { BrandWordmark } from "@/components/layout/brand";
import { Bell } from "lucide-react";
import { useTranslations } from "@/hooks/use-translations";

interface HeroProps {
  greeting?: string;
}

export function Hero({ greeting }: HeroProps) {
  const t = useTranslations();
  return (
    <section className="relative">
      <div className="flex items-center justify-between">
        <BrandWordmark />
        <button
          aria-label={t.common.notifications}
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-silver-light shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
        </button>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.05 }}
        className="mt-8"
      >
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {greeting ?? t.home.welcome}
        </p>
        <h1 className="mt-3 font-serif text-[34px] leading-[1.05] font-medium tracking-tight">
          <span className="text-gradient-silver">{t.home.heroTitleLine1}</span>
          <br />
          <span className="text-foreground/90">{t.home.heroTitleLine2}</span>
        </h1>
        <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">
          {t.home.heroSubtitle}
        </p>
      </motion.div>
    </section>
  );
}
