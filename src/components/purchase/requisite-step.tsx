"use client";

import { Check, Copy, CreditCard, ShieldCheck, Wallet } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/shared/glass-card";
import { cn, formatCurrency, truncateMiddle } from "@/lib/utils";
import { haptic } from "@/lib/telegram";
import { useCopy } from "@/hooks/use-copy";
import { useTranslations } from "@/hooks/use-translations";
import type { PaymentRequisite } from "@/types";

interface Props {
  requisites: PaymentRequisite[];
  value: string;
  onChange: (id: string) => void;
  amount: number;
}

export function RequisiteStep({ requisites, value, onChange, amount }: Props) {
  const t = useTranslations();
  const { copy } = useCopy();
  const active = requisites.find((r) => r.id === value) ?? requisites[0];

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {requisites
          .filter((r) => r.active)
          .map((r) => {
            const isOn = r.id === value;
            const Icon = r.method === "card" ? CreditCard : Wallet;
            return (
              <motion.button
                key={r.id}
                whileTap={{ scale: 0.99 }}
                onClick={() => {
                  haptic("selection");
                  onChange(r.id);
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-all",
                  isOn
                    ? "border-white/20 bg-white/[0.06]"
                    : "border-white/[0.06] bg-white/[0.02]",
                )}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-silver-light">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{r.label}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {truncateMiddle(r.address, 8, 8)}
                  </p>
                </div>
                <span
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded-full transition-all",
                    isOn
                      ? "bg-white text-graphite-950"
                      : "border border-white/15",
                  )}
                >
                  {isOn && <Check className="h-3 w-3" />}
                </span>
              </motion.button>
            );
          })}
      </div>

      <GlassCard accent="premium" className="p-5">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>{t.purchase.sendExactly}</span>
          <span>{active.network ?? active.currency}</span>
        </div>
        <p className="mt-2 font-serif text-3xl tracking-tight text-foreground">
          {formatCurrency(amount)}
        </p>

        <div className="mt-4 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t.purchase.toAddress}
          </p>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-graphite-950/40 px-3.5 py-3">
            <p className="flex-1 break-all font-mono text-[12px] leading-relaxed text-silver-light">
              {active.address}
            </p>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => copy(active.address, t.toasts.addressCopied)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-400/15 bg-amber-400/[0.04] p-3 text-[11px] leading-relaxed text-amber-200/90">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>{t.purchase.warning}</p>
        </div>
      </GlassCard>
    </div>
  );
}
