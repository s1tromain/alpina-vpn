"use client";

import { motion } from "framer-motion";
import {
  Lock,
  Globe2,
  Zap,
  EyeOff,
  ShieldCheck,
  Coins,
} from "lucide-react";
import { GlassCard } from "@/components/shared/glass-card";
import { useTranslations } from "@/hooks/use-translations";

const icons = [EyeOff, Lock, Globe2, Zap, ShieldCheck, Coins];

export function FeaturesSection() {
  const t = useTranslations();
  return (
    <div className="grid grid-cols-2 gap-3">
      {t.features.items.map((f, idx) => {
        const Icon = icons[idx] ?? Lock;
        return (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.04, duration: 0.4 }}
          >
            <GlassCard className="h-full p-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-silver-light">
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-3 text-sm font-medium">{f.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {f.description}
              </p>
            </GlassCard>
          </motion.div>
        );
      })}
    </div>
  );
}
