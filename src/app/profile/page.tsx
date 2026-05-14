"use client";

import Link from "next/link";
import {
  Calendar,
  ChevronRight,
  Crown,
  Hash,
  LifeBuoy,
  LogOut,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { GlassCard } from "@/components/shared/glass-card";
import { PageHeader } from "@/components/shared/page-header";
import { SectionHeading } from "@/components/shared/section-heading";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserStore } from "@/stores/user-store";
import { useTranslations, format } from "@/hooks/use-translations";
import { useFormatters } from "@/hooks/use-formatters";
import { LanguageSwitch } from "@/components/shared/language-switch";
import { formatBytes, shortName } from "@/lib/utils";

export default function ProfilePage() {
  const t = useTranslations();
  const { formatDate, daysUntil } = useFormatters();
  const { user, subscription, loading } = useUserStore();

  return (
    <AppShell>
      <PageHeader
        title={t.profile.title}
        subtitle={t.profile.subtitle}
        back={false}
      />

      {loading || !user ? (
        <div className="space-y-4">
          <Skeleton className="h-44 rounded-3xl" />
          <Skeleton className="h-40 rounded-3xl" />
          <Skeleton className="h-24 rounded-3xl" />
        </div>
      ) : (
        <>
          {/* Identity card */}
          <GlassCard accent="premium" className="p-6">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-white/10 to-transparent font-serif text-xl text-silver-light">
                  {user.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.photoUrl}
                      alt={user.firstName}
                      className="h-full w-full rounded-full object-cover"
                    />
                  ) : (
                    shortName(user.firstName, user.lastName)
                  )}
                </div>
                {user.isPremium && (
                  <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border border-graphite-900 bg-gradient-to-br from-silver-light to-silver">
                    <Crown className="h-3 w-3 text-graphite-950" />
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-lg tracking-tight">
                  {user.firstName} {user.lastName ?? ""}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  @{user.username}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {user.isPremium && (
                    <Badge variant="premium">
                      <Sparkles className="h-3 w-3" /> {t.roles.tgPremium}
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {user.role === "admin"
                      ? t.roles.admin
                      : user.role === "operator"
                        ? t.roles.operator
                        : t.roles.member}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <InfoTile
                icon={<Hash className="h-3.5 w-3.5" />}
                label={t.profile.telegramId}
                value={String(user.telegramId)}
              />
              <InfoTile
                icon={<Calendar className="h-3.5 w-3.5" />}
                label={t.profile.memberSince}
                value={formatDate(user.registeredAt)}
              />
            </div>
          </GlassCard>

          {/* Active subscription */}
          <section className="mt-8 space-y-3">
            <SectionHeading
              eyebrow={t.profile.membershipEyebrow}
              title={t.profile.membershipTitle}
            />
            {subscription ? (
              <GlassCard className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                      {t.profile.plan}
                    </p>
                    <p className="mt-1 font-serif text-lg">
                      {(t.plans as Record<string, string>)[
                        subscription.plan.duration
                      ] ?? subscription.plan.label}
                    </p>
                  </div>
                  <Badge variant="success">
                    <ShieldCheck className="h-3 w-3" /> {t.status.active}
                  </Badge>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <InfoTile
                    label={t.profile.country}
                    value={`${subscription.country.flag} ${
                      (t.countries as Record<string, string>)[
                        subscription.country.code
                      ] ?? subscription.country.name
                    }`}
                  />
                  <InfoTile
                    label={t.profile.expires}
                    value={formatDate(subscription.expiresAt)}
                    accent
                  />
                  <InfoTile
                    label={t.profile.devices}
                    value={`${subscription.activeDevices} / ${subscription.maxDevices}`}
                  />
                  <InfoTile
                    label={t.profile.traffic}
                    value={
                      subscription.trafficLimit == null
                        ? format(t.profile.trafficUnlimited, {
                            used: formatBytes(subscription.trafficUsed),
                          })
                        : format(t.profile.trafficLimited, {
                            used: formatBytes(subscription.trafficUsed),
                            total: formatBytes(subscription.trafficLimit),
                          })
                    }
                  />
                </div>

                <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {t.profile.daysRemaining}
                    </p>
                    <p className="font-mono text-xl text-silver-light">
                      {daysUntil(subscription.expiresAt)}
                    </p>
                  </div>
                  <Button variant="secondary" size="sm" asChild>
                    <Link href="/vpn">{t.profile.manage}</Link>
                  </Button>
                </div>
              </GlassCard>
            ) : (
              <GlassCard className="p-6">
                <p className="text-sm text-muted-foreground">
                  {t.profile.noSub}
                </p>
                <Button asChild className="mt-4">
                  <Link href="/purchase">{t.profile.browse}</Link>
                </Button>
              </GlassCard>
            )}
          </section>

          {/* Settings — Language */}
          <section className="mt-8 space-y-3">
            <SectionHeading
              eyebrow={t.profile.settings.eyebrow}
              title={t.profile.settings.title}
            />
            <GlassCard className="p-5">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {t.language.label}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {t.language.hint}
                  </p>
                </div>
                <LanguageSwitch />
              </div>
            </GlassCard>
          </section>

          {/* Quick links */}
          <section className="mt-8 space-y-2">
            <Link
              href="/support"
              className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-silver-light">
                <LifeBuoy className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium">{t.profile.supportTitle}</p>
                <p className="text-[11px] text-muted-foreground">
                  {t.profile.supportDesc}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </Link>

            <Button
              variant="secondary"
              size="lg"
              className="w-full text-muted-foreground"
            >
              <LogOut className="h-4 w-4" />
              {t.profile.signOut}
            </Button>
          </section>
        </>
      )}
    </AppShell>
  );
}

function InfoTile({
  icon,
  label,
  value,
  accent,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <p
        className={
          accent ? "mt-1 text-sm font-medium text-silver-light" : "mt-1 text-sm"
        }
      >
        {value}
      </p>
    </div>
  );
}
