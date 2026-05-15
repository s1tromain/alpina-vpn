"use client";

import Link from "next/link";
import {
  CalendarClock,
  Cpu,
  Gauge,
  Globe2,
  Layers,
  Lock,
  Sparkles,
} from "lucide-react";
import { GlassCard } from "@/components/shared/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useUserStore } from "@/stores/user-store";
import { useTranslations, format } from "@/hooks/use-translations";
import { useFormatters } from "@/hooks/use-formatters";
import { formatBytes } from "@/lib/utils";
import type { Subscription } from "@/types";

const PROTOCOL_LABEL = "Reality · VLESS";
const CIPHER_LABEL = "AES-256-GCM";

const PRIMARY_CITY: Record<string, string> = {
  NL: "Amsterdam",
  DE: "Frankfurt",
  CH: "Zürich",
  GB: "London",
  US: "New York",
  JP: "Tokyo",
  SG: "Singapore",
  AE: "Dubai",
  FR: "Paris",
  SE: "Stockholm",
  CA: "Toronto",
  AU: "Sydney",
};

export function SubscriptionDashboard() {
  const t = useTranslations();
  const subscription = useUserStore((s) => s.subscription);

  if (!subscription) return <InactiveCard />;

  return <ActiveCard subscription={subscription} />;
}

function ActiveCard({ subscription }: { subscription: Subscription }) {
  const t = useTranslations();
  const { formatDate, daysUntil } = useFormatters();

  const localizedCountry =
    (t.countries as Record<string, string>)[subscription.country.code] ??
    subscription.country.name;
  const cityEn = PRIMARY_CITY[subscription.country.code];
  const localizedCity = cityEn
    ? (t.cities as Record<string, string>)[cityEn] ?? cityEn
    : null;

  const planLabel =
    (t.plans as Record<string, string>)[subscription.plan.duration] ??
    subscription.plan.label;

  const trafficLabel =
    subscription.trafficLimit == null
      ? format(t.dashboard.trafficUnlimited, {
          used: formatBytes(subscription.trafficUsed),
        })
      : `${formatBytes(subscription.trafficUsed)} / ${formatBytes(
          subscription.trafficLimit,
        )}`;
  const trafficPct =
    subscription.trafficLimit && subscription.trafficLimit > 0
      ? Math.min(
          100,
          Math.round((subscription.trafficUsed / subscription.trafficLimit) * 100),
        )
      : null;

  const daysLeft = daysUntil(subscription.expiresAt);

  return (
    <GlassCard accent="premium" className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t.dashboard.eyebrow}
          </p>
          <p className="mt-1.5 font-serif text-lg leading-tight tracking-tight">
            {planLabel}
          </p>
        </div>
        <Badge variant="success">
          <Sparkles className="h-3 w-3" />
          {t.dashboard.statusActive}
        </Badge>
      </div>

      {/* Headline server row */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
        <span className="text-2xl leading-none">{subscription.country.flag}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t.dashboard.server}
          </p>
          <p className="mt-0.5 truncate text-sm font-medium text-foreground">
            {localizedCountry}
            {localizedCity ? (
              <span className="text-muted-foreground"> — {localizedCity}</span>
            ) : null}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t.dashboard.ping}
          </p>
          <p className="mt-0.5 font-mono text-xs text-silver-light">
            {format(t.common.pingMs, { n: subscription.country.ping })}
          </p>
        </div>
      </div>

      {/* Detail grid */}
      <div className="mt-3 grid grid-cols-2 gap-2.5">
        <DetailTile
          icon={<CalendarClock className="h-3.5 w-3.5" />}
          label={t.dashboard.expires}
          value={formatDate(subscription.expiresAt)}
        />
        <DetailTile
          icon={<Gauge className="h-3.5 w-3.5" />}
          label={t.dashboard.daysLeft}
          value={String(daysLeft)}
          accent
        />
        <DetailTile
          icon={<Cpu className="h-3.5 w-3.5" />}
          label={t.dashboard.protocol}
          value={PROTOCOL_LABEL}
        />
        <DetailTile
          icon={<Lock className="h-3.5 w-3.5" />}
          label={t.dashboard.cipher}
          value={CIPHER_LABEL}
          mono
        />
      </div>

      {/* Traffic row */}
      <div className="mt-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <Layers className="h-3.5 w-3.5" />
            {t.dashboard.traffic}
          </div>
          <p className="font-mono text-xs text-silver-light">{trafficLabel}</p>
        </div>
        <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-white/[0.04]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-silver-light/70 to-silver-light/30"
            style={{ width: `${trafficPct ?? 6}%` }}
          />
        </div>
      </div>

      {/* Devices row */}
      <div className="mt-3 flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <Globe2 className="h-3.5 w-3.5" />
          {t.dashboard.devices}
        </div>
        <p className="font-mono text-xs">
          <span className="text-foreground">{subscription.activeDevices}</span>
          <span className="text-muted-foreground"> / {subscription.maxDevices}</span>
        </p>
      </div>
    </GlassCard>
  );
}

function InactiveCard() {
  const t = useTranslations();
  return (
    <GlassCard accent="premium" className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {t.dashboard.eyebrow}
          </p>
          <p className="mt-1.5 font-serif text-lg leading-tight tracking-tight">
            {t.dashboard.inactiveTitle}
          </p>
        </div>
        <Badge variant="outline">{t.dashboard.statusInactive}</Badge>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        {t.dashboard.inactiveDesc}
      </p>

      <Button asChild size="lg" className="mt-5 w-full">
        <Link href="/purchase">{t.dashboard.activate}</Link>
      </Button>
    </GlassCard>
  );
}

function DetailTile({
  icon,
  label,
  value,
  accent,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <p
        className={
          accent
            ? "mt-1 font-mono text-base text-silver-light"
            : mono
              ? "mt-1 font-mono text-xs text-foreground"
              : "mt-1 text-sm font-medium text-foreground"
        }
      >
        {value}
      </p>
    </div>
  );
}
