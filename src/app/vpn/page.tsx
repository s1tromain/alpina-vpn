"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import {
  Copy,
  Download,
  ExternalLink,
  Smartphone,
  Monitor,
  ShieldCheck,
  Search,
} from "lucide-react";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { GlassCard } from "@/components/shared/glass-card";
import { SectionHeading } from "@/components/shared/section-heading";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { ServerList } from "@/components/vpn/server-list";
import { api } from "@/lib/api";
import { useResource } from "@/hooks/use-resource";
import { useUserStore } from "@/stores/user-store";
import { useCopy } from "@/hooks/use-copy";
import { openExternal } from "@/lib/telegram";
import { formatBytes, truncateMiddle } from "@/lib/utils";
import { useFormatters } from "@/hooks/use-formatters";
import { useTranslations, format } from "@/hooks/use-translations";

export default function VpnPage() {
  const t = useTranslations();
  const { daysUntil } = useFormatters();
  const { subscription, loading } = useUserStore();
  const { copy } = useCopy();

  // /vpn/servers is a public catalogue route, fetched alongside the page.
  const { data: serversData, loading: serversLoading } = useResource(
    () => api.servers.list(),
    { requiresAuth: false },
  );
  const servers = useMemo(() => serversData ?? [], [serversData]);

  const downloads = [
    {
      platform: t.vpn.platforms.ios,
      icon: Smartphone,
      url: "https://apps.apple.com/app/hiddify/id6596777532",
    },
    {
      platform: t.vpn.platforms.android,
      icon: Smartphone,
      url: "https://play.google.com/store/apps/details?id=app.hiddify.com",
    },
    {
      platform: t.vpn.platforms.desktop,
      icon: Monitor,
      url: "https://hiddify.com/",
    },
  ];

  const [tab, setTab] = useState<"access" | "servers">("access");
  const [serverId, setServerId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Pick the first online server once the list lands. Done in an effect
  // so the initial render doesn't depend on data and we avoid hydration
  // mismatches.
  useEffect(() => {
    if (serverId !== null || servers.length === 0) return;
    const first = servers.find((s) => s.status === "online") ?? servers[0];
    if (first) setServerId(first.id);
  }, [serverId, servers]);

  const filteredServers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return servers;
    return servers.filter(
      (s) =>
        s.country.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.countryCode.toLowerCase().includes(q),
    );
  }, [search, servers]);

  if (loading) {
    return (
      <AppShell>
        <PageHeader title={t.vpn.title} back={false} />
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-64 rounded-3xl" />
          <Skeleton className="h-44 rounded-3xl" />
        </div>
      </AppShell>
    );
  }

  if (!subscription) {
    return (
      <AppShell>
        <PageHeader title={t.vpn.title} back={false} />
        <EmptyState
          icon={ShieldCheck}
          title={t.vpn.noActiveTitle}
          description={t.vpn.noActiveDesc}
          action={
            <Button asChild>
              <Link href="/purchase">{t.vpn.browsePlans}</Link>
            </Button>
          }
        />
      </AppShell>
    );
  }

  const url = subscription.subscriptionUrl;
  const localizedCountry =
    (t.countries as Record<string, string>)[subscription.country.code] ??
    subscription.country.name;
  const trafficLabel =
    subscription.trafficLimit == null
      ? format(t.vpn.trafficUnlimited, {
          used: formatBytes(subscription.trafficUsed),
        })
      : format(t.vpn.trafficLimited, {
          used: formatBytes(subscription.trafficUsed),
          total: formatBytes(subscription.trafficLimit),
        });

  return (
    <AppShell>
      <PageHeader
        title={t.vpn.title}
        subtitle={t.vpn.subtitle}
        back={false}
      />

      {/* Subscription summary */}
      <GlassCard accent="premium" className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {t.vpn.subscriptionEyebrow}
            </p>
            <p className="mt-1 font-serif text-lg">
              {(t.plans as Record<string, string>)[subscription.plan.tier] ??
                subscription.plan.label}{" "}
              · {subscription.country.flag} {localizedCountry}
            </p>
          </div>
          <Badge variant="success">
            <ShieldCheck className="h-3 w-3" />
            {format(t.vpn.daysLeftBadge, { n: daysUntil(subscription.expiresAt) })}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {t.vpn.devicesLabel}
            </p>
            <p className="mt-1 text-sm">
              <span className="text-foreground">{subscription.activeDevices}</span>{" "}
              <span className="text-muted-foreground">/ {subscription.maxDevices}</span>
            </p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {t.vpn.trafficLabel}
            </p>
            <p className="mt-1 text-sm text-foreground">{trafficLabel}</p>
          </div>
        </div>
      </GlassCard>

      <div className="mt-6">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList className="w-full">
            <TabsTrigger value="access" className="flex-1">
              {t.vpn.tabAccess}
            </TabsTrigger>
            <TabsTrigger value="servers" className="flex-1">
              {t.vpn.tabServers}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="access" className="space-y-6">
            <GlassCard className="p-6">
              <div className="flex flex-col items-center gap-4">
                <div className="rounded-2xl bg-white p-4 shadow-glass">
                  <QRCodeSVG
                    value={url}
                    size={196}
                    level="M"
                    bgColor="#ffffff"
                    fgColor="#050506"
                    includeMargin={false}
                  />
                </div>
                <p className="max-w-[260px] text-center text-xs leading-relaxed text-muted-foreground">
                  {t.vpn.qrCaption}
                </p>
              </div>

              <div className="mt-5 space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {t.vpn.subscriptionUrl}
                </p>
                <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-graphite-950/40 px-3.5 py-3">
                  <p className="flex-1 truncate font-mono text-[11px] text-silver-light">
                    {truncateMiddle(url, 24, 14)}
                  </p>
                  <Button
                    variant="secondary"
                    size="icon"
                    onClick={() => copy(url, t.toasts.linkCopied)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </GlassCard>

            {/* Downloads */}
            <section className="space-y-3">
              <SectionHeading
                eyebrow={t.vpn.clientEyebrow}
                title={t.vpn.clientTitle}
                description={t.vpn.clientDesc}
              />
              <div className="space-y-2">
                {downloads.map((d) => {
                  const Icon = d.icon;
                  return (
                    <button
                      key={d.platform}
                      onClick={() => openExternal(d.url)}
                      className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-3.5 text-left transition-colors hover:bg-white/[0.04]"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-silver-light">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{d.platform}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {t.vpn.openSite}
                        </p>
                      </div>
                      <ExternalLink className="h-4 w-4 text-muted-foreground" />
                    </button>
                  );
                })}
              </div>

              <Button
                size="lg"
                className="w-full"
                onClick={() => openExternal("https://hiddify.com/")}
              >
                <Download className="h-4 w-4" />
                {t.vpn.downloadHiddify}
              </Button>
            </section>

            {/* Setup steps */}
            <section className="space-y-3">
              <SectionHeading
                eyebrow={t.vpn.setupEyebrow}
                title={t.vpn.setupTitle}
              />
              <ol className="space-y-2">
                {t.vpn.setupSteps.map((step, idx) => (
                  <li
                    key={idx}
                    className="flex gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] font-serif text-xs text-silver-light">
                      {idx + 1}
                    </span>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            </section>
          </TabsContent>

          <TabsContent value="servers" className="space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.vpn.searchServers}
                className="pl-9"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>
                {filteredServers.filter((s) => s.status === "online").length}{" "}
                {t.common.online}
              </span>
              <span>
                {filteredServers.length} {t.common.total}
              </span>
            </div>

            {serversLoading && servers.length === 0 ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 rounded-2xl" />
                ))}
              </div>
            ) : (
              <ServerList
                servers={filteredServers}
                value={serverId}
                onChange={setServerId}
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div className="pb-6" />
    </AppShell>
  );
}
