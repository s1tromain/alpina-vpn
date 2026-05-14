"use client";

import { motion } from "framer-motion";
import { Check, Smartphone, Infinity as InfinityIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { haptic } from "@/lib/telegram";
import { useTranslations, format } from "@/hooks/use-translations";
import type { Plan } from "@/types";

interface Props {
  plans: Plan[];
  value: string;
  onChange: (id: string) => void;
}

export function PlanStep({ plans, value, onChange }: Props) {
  const t = useTranslations();
  return (
    <div className="space-y-2.5">
      {plans.map((p) => {
        const active = p.id === value;
        const planLabel =
          (t.plans as Record<string, string>)[p.duration] ?? p.label;
        const badgeLabel = p.badge
          ? (t.planBadges as Record<string, string>)[p.badge] ?? p.badge
          : null;
        return (
          <motion.button
            key={p.id}
            whileTap={{ scale: 0.99 }}
            onClick={() => {
              haptic("selection");
              onChange(p.id);
            }}
            className={cn(
              "relative flex w-full items-center gap-4 rounded-3xl border p-4 text-left transition-all",
              active
                ? "border-white/20 bg-white/[0.06]"
                : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]",
            )}
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-serif text-base text-foreground">
                  {planLabel}
                </p>
                {badgeLabel && (
                  <Badge
                    variant={p.badge === "Best value" ? "premium" : "outline"}
                  >
                    {badgeLabel}
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {format(t.purchase.perMonth, {
                  amount: formatCurrency(p.monthlyEquivalent),
                })}
                {p.savingsPercent
                  ? ` · ${format(t.purchase.saveN, { n: p.savingsPercent })}`
                  : ""}
              </p>

              <div className="mt-2.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />{" "}
                  {format(t.purchase.devicesN, { n: p.maxDevices })}
                </span>
                <span className="inline-flex items-center gap-1">
                  <InfinityIcon className="h-3 w-3" /> {t.common.unlimitedTraffic}
                </span>
              </div>
            </div>

            <div className="text-right">
              <p className="font-serif text-2xl tracking-tight">
                {formatCurrency(p.priceUsd)}
              </p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {t.purchase.totalLabel}
              </p>
            </div>

            <span
              className={cn(
                "absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full transition-all",
                active
                  ? "bg-white text-graphite-950"
                  : "border border-white/15 bg-transparent",
              )}
            >
              {active && <Check className="h-3 w-3" />}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}
