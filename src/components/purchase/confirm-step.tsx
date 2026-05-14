"use client";

import { Smartphone, Globe2, Wallet, Banknote } from "lucide-react";
import { GlassCard } from "@/components/shared/glass-card";
import { cn, formatCurrency } from "@/lib/utils";
import { useTranslations } from "@/hooks/use-translations";
import type { Country, PaymentRequisite, Plan } from "@/types";

interface Props {
  plan: Plan;
  country: Country;
  requisite: PaymentRequisite;
}

export function ConfirmStep({ plan, country, requisite }: Props) {
  const t = useTranslations();
  const localizedPlan =
    (t.plans as Record<string, string>)[plan.duration] ?? plan.label;
  const localizedCountry =
    (t.countries as Record<string, string>)[country.code] ?? country.name;

  return (
    <div className="space-y-4">
      <GlassCard accent="premium" className="p-5">
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {t.purchase.summary}
        </p>

        <div className="mt-3 space-y-3 text-sm">
          <Row
            icon={<Banknote className="h-3.5 w-3.5" />}
            label={t.purchase.fields.plan}
            value={localizedPlan}
          />
          <Row
            icon={<Globe2 className="h-3.5 w-3.5" />}
            label={t.purchase.fields.location}
            value={`${country.flag} ${localizedCountry}`}
          />
          <Row
            icon={<Smartphone className="h-3.5 w-3.5" />}
            label={t.purchase.fields.devices}
            value={String(plan.maxDevices)}
          />
          <Row
            icon={<Wallet className="h-3.5 w-3.5" />}
            label={t.purchase.fields.method}
            value={requisite.label}
          />

          <div className="divider-noble my-3" />

          <div className="flex items-end justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {t.purchase.fields.total}
            </span>
            <span className="font-serif text-3xl tracking-tight text-foreground">
              {formatCurrency(plan.priceUsd)}
            </span>
          </div>
        </div>
      </GlassCard>

      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5 text-[11px] leading-relaxed text-muted-foreground">
        {t.purchase.fineprint}
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className={cn("text-foreground")}>{value}</span>
    </div>
  );
}
