"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Plan } from "@/types";
import { Badge } from "@/components/ui/badge";
import { cn, formatCurrency } from "@/lib/utils";
import { haptic } from "@/lib/telegram";
import { useTranslations, format } from "@/hooks/use-translations";

interface Props {
  plans: Plan[];
}

export function PlansGrid({ plans }: Props) {
  const t = useTranslations();
  return (
    <div className="grid grid-cols-2 gap-3">
      {plans.map((plan, idx) => {
        const highlight = plan.badge === "Best value";
        const label =
          (t.plans as Record<string, string>)[plan.duration] ?? plan.label;
        const badgeLabel = plan.badge
          ? (t.planBadges as Record<string, string>)[plan.badge] ?? plan.badge
          : null;
        return (
          <motion.div
            key={plan.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.4 }}
          >
            <Link
              href={`/purchase?plan=${plan.id}`}
              onClick={() => haptic("light")}
              className={cn(
                "relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl border p-4 transition-all",
                highlight
                  ? "border-white/15 bg-gradient-to-b from-white/[0.07] to-white/[0.01]"
                  : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]",
              )}
            >
              {badgeLabel && (
                <Badge
                  variant={highlight ? "premium" : "outline"}
                  className="self-start"
                >
                  {badgeLabel}
                </Badge>
              )}
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  {label}
                </p>
                <p className="mt-1 font-serif text-2xl tracking-tight text-foreground">
                  {formatCurrency(plan.priceUsd)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatCurrency(plan.monthlyEquivalent)} {t.common.perMonth}
                </p>
              </div>
              {plan.savingsPercent && (
                <p className="text-[10px] text-silver-light">
                  {format(t.common.save_n, { n: plan.savingsPercent })}
                </p>
              )}
              <div className="mt-auto inline-flex items-center gap-1 text-[10px] text-muted-foreground/80">
                {t.common.continue} →
              </div>
            </Link>
          </motion.div>
        );
      })}
    </div>
  );
}
