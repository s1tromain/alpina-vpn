"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslations, format } from "@/hooks/use-translations";

interface StepperProps {
  steps: { label: string }[];
  current: number;
}

export function Stepper({ steps, current }: StepperProps) {
  const t = useTranslations();
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        {steps.map((_, idx) => {
          const isDone = idx < current;
          const isActive = idx === current;
          return (
            <div key={idx} className="flex flex-1 items-center gap-1.5">
              <motion.span
                initial={false}
                animate={{
                  scaleX: isDone || isActive ? 1 : 0.35,
                  opacity: isDone || isActive ? 1 : 0.5,
                }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className={cn(
                  "h-[3px] flex-1 origin-left rounded-full",
                  isDone
                    ? "bg-gradient-to-r from-silver-light to-silver"
                    : isActive
                      ? "bg-white"
                      : "bg-white/10",
                )}
              />
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {format(t.purchase.stepN, { n: current + 1, total: steps.length })}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-foreground/80">
          {current > 0 && (
            <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white text-graphite-950">
              <Check className="h-2 w-2" />
            </span>
          )}
          {steps[current]?.label}
        </div>
      </div>
    </div>
  );
}
