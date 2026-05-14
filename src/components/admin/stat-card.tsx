"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: { value: string; positive?: boolean };
  index?: number;
}

export function StatCard({ icon: Icon, label, value, delta, index = 0 }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.4 }}
      className="relative overflow-hidden rounded-3xl border border-white/[0.06] bg-white/[0.02] p-5 backdrop-blur-xl"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 font-serif text-3xl tracking-tight text-foreground">
            {value}
          </p>
          {delta && (
            <p
              className={cn(
                "mt-1 text-[11px]",
                delta.positive ? "text-emerald-300" : "text-red-300",
              )}
            >
              {delta.positive ? "↑" : "↓"} {delta.value}
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-silver-light">
          <Icon className="h-4 w-4" />
        </div>
      </div>

      {/* subtle bottom sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />
    </motion.div>
  );
}
