"use client";

import Link from "next/link";
import {
  Users as UsersIcon,
  ShieldCheck,
  DollarSign,
  CheckCircle2,
  XCircle,
  Clock,
  Server as ServerIcon,
} from "lucide-react";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { StatCard } from "@/components/admin/stat-card";
import { GlassCard } from "@/components/shared/glass-card";
import { StatusPill } from "@/components/shared/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { useResource } from "@/hooks/use-resource";
import { useTranslations, format } from "@/hooks/use-translations";
import { useFormatters } from "@/hooks/use-formatters";

export default function AdminDashboard() {
  const t = useTranslations();
  const { formatCurrency, formatDateTime } = useFormatters();

  const statsRes = useResource(() => api.admin.stats());
  const ordersRes = useResource(() => api.admin.orders({ take: 6 }));

  const stats = statsRes.data;
  const recent = ordersRes.data ?? [];

  const totalDecisions = stats
    ? stats.approvedPayments + stats.rejectedPayments
    : 0;
  const approvalRate =
    stats && totalDecisions > 0
      ? ((stats.approvedPayments / totalDecisions) * 100).toFixed(1)
      : "—";

  return (
    <>
      <AdminTopbar
        title={t.admin.overview.title}
        subtitle={t.admin.overview.subtitle}
      />

      <div className="p-4 lg:p-8">
        {!stats ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-3xl" />
            ))}
          </div>
        ) : (
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 xl:grid-cols-4">
            <StatCard
              icon={UsersIcon}
              label={t.admin.stats.totalUsers}
              value={stats.totalUsers.toLocaleString()}
              index={0}
            />
            <StatCard
              icon={ShieldCheck}
              label={t.admin.stats.activeSubs}
              value={stats.activeSubscriptions.toLocaleString()}
              index={1}
            />
            <StatCard
              icon={DollarSign}
              label={t.admin.stats.revenue}
              value={formatCurrency(stats.revenueUsd)}
              delta={{
                value: `${stats.revenueDeltaPct.toFixed(1)}${t.admin.stats.mom}`,
                positive: stats.revenueDeltaPct >= 0,
              }}
              index={2}
            />
            <StatCard
              icon={ServerIcon}
              label={t.admin.stats.servers}
              value={`${stats.serversOnline} / ${stats.serversTotal}`}
              delta={{ value: t.admin.stats.allRegions, positive: true }}
              index={3}
            />
            <StatCard
              icon={CheckCircle2}
              label={t.admin.stats.approved}
              value={stats.approvedPayments.toLocaleString()}
              index={4}
            />
            <StatCard
              icon={XCircle}
              label={t.admin.stats.rejected}
              value={stats.rejectedPayments.toLocaleString()}
              index={5}
            />
            <StatCard
              icon={Clock}
              label={t.admin.stats.pending}
              value={stats.pendingPayments.toLocaleString()}
              index={6}
            />
            <StatCard
              icon={ShieldCheck}
              label={t.admin.stats.approvalRate}
              value={approvalRate === "—" ? "—" : `${approvalRate}%`}
              index={7}
            />
          </section>
        )}

        <section className="mt-8 grid grid-cols-1 gap-4 xl:grid-cols-3">
          <GlassCard className="p-5 xl:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  {t.admin.recent.eyebrow}
                </p>
                <p className="mt-1 font-serif text-lg">{t.admin.recent.title}</p>
              </div>
              <Button variant="secondary" size="sm" asChild>
                <Link href="/admin/orders">{t.admin.recent.openQueue}</Link>
              </Button>
            </div>

            {ordersRes.loading && recent.length === 0 ? (
              <div className="mt-4 space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-14 rounded-2xl" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <p className="mt-6 text-sm text-muted-foreground">
                {t.orders.emptyTitle}
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-white/[0.04]">
                {recent.map((o) => (
                  <li
                    key={o.id}
                    className="flex items-center justify-between gap-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">
                        #{o.id.slice(-6)} ·{" "}
                        <span className="text-muted-foreground">@{o.username}</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {o.planLabel}{" "}
                        ·{" "}
                        {(t.countries as Record<string, string>)[o.countryCode] ??
                          o.countryName}{" "}
                        · {formatDateTime(o.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-mono text-sm">
                        {formatCurrency(o.amount, o.currency)}
                      </p>
                      <StatusPill status={o.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>

          <GlassCard className="p-5">
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {t.admin.revenueCard.eyebrow}
            </p>
            <p className="mt-1 font-serif text-lg">{t.admin.revenueCard.title}</p>

            {/*
              The backend currently exposes period totals only. Once a
              `/admin/revenue?days=N` endpoint lands we'll re-render a real
              chart here. For now we surface the headline number + delta
              instead of a misleading placeholder.
            */}
            <div className="mt-6 flex h-32 flex-col items-start justify-between">
              <div>
                <p className="font-mono text-3xl text-silver-light">
                  {stats ? formatCurrency(stats.revenueUsd) : "—"}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {format(t.admin.revenueCard.last30 ?? "Last 30 days", {})}
                </p>
              </div>
              {stats && (
                <Badge variant={stats.revenueDeltaPct >= 0 ? "success" : "destructive"}>
                  {stats.revenueDeltaPct >= 0 ? "+" : ""}
                  {stats.revenueDeltaPct.toFixed(1)}
                  {t.admin.stats.mom}
                </Badge>
              )}
            </div>
          </GlassCard>
        </section>
      </div>
    </>
  );
}
