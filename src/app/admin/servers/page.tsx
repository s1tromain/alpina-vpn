"use client";

import { useMemo, useState } from "react";
import { Search, ServerCog, Loader2 } from "lucide-react";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { DataTable } from "@/components/admin/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useResource } from "@/hooks/use-resource";
import { cn } from "@/lib/utils";
import { useTranslations, format } from "@/hooks/use-translations";
import type { ServerStatus, VPNServer } from "@/types";

const statusVariant: Record<ServerStatus, "success" | "warning" | "destructive"> = {
  online: "success",
  maintenance: "warning",
  offline: "destructive",
};

export default function AdminServersPage() {
  const t = useTranslations();
  const [q, setQ] = useState("");

  // /vpn/servers is the same public catalogue the user-facing app
  // consumes; admins see the same view (admin-specific edit endpoints
  // are not implemented yet).
  const { data, loading } = useResource(() => api.servers.list(), {
    requiresAuth: false,
  });
  const servers = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return servers;
    return servers.filter(
      (x) =>
        x.country.toLowerCase().includes(s) ||
        x.city.toLowerCase().includes(s) ||
        x.countryCode.toLowerCase().includes(s) ||
        x.protocol.toLowerCase().includes(s),
    );
  }, [q, servers]);

  const online = servers.filter((s) => s.status === "online").length;

  return (
    <>
      <AdminTopbar
        title={t.admin.servers.title}
        subtitle={format(t.admin.servers.subtitle, {
          online,
          total: servers.length,
        })}
      />

      <div className="p-4 lg:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t.admin.servers.search}
              className="pl-9"
            />
          </div>
          <Button disabled title="Marzban admin API not wired yet">
            <ServerCog className="h-4 w-4" />
            {t.admin.servers.add}
          </Button>
        </div>

        {loading && servers.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <DataTable
            data={filtered}
            rowKey={(s) => s.id}
            columns={[
              {
                header: t.admin.servers.cols.server,
                cell: (s: VPNServer) => {
                  const localizedCity =
                    (t.cities as Record<string, string>)[s.city] ?? s.city;
                  const localizedCountry =
                    (t.countries as Record<string, string>)[s.countryCode] ??
                    s.country;
                  return (
                    <div className="flex items-center gap-3">
                      <span className="text-xl leading-none">{s.flag}</span>
                      <div>
                        <p className="text-sm font-medium">
                          {localizedCity}, {localizedCountry}
                        </p>
                        <p className="font-mono text-[11px] text-muted-foreground">
                          {s.id}
                        </p>
                      </div>
                    </div>
                  );
                },
              },
              {
                header: t.admin.servers.cols.protocol,
                cell: (s) => <Badge variant="outline">{s.protocol}</Badge>,
              },
              {
                header: t.admin.servers.cols.status,
                cell: (s) => (
                  <Badge variant={statusVariant[s.status]}>
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        s.status === "online"
                          ? "bg-emerald-400"
                          : s.status === "maintenance"
                            ? "bg-amber-400"
                            : "bg-red-400",
                      )}
                    />
                    {(t.status as Record<string, string>)[s.status] ?? s.status}
                  </Badge>
                ),
              },
              {
                header: t.admin.servers.cols.load,
                cell: (s) =>
                  s.status === "offline" ? (
                    <span className="text-xs text-muted-foreground">—</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className={cn(
                            "h-full rounded-full",
                            s.load < 30
                              ? "bg-emerald-400"
                              : s.load < 70
                                ? "bg-amber-400"
                                : "bg-red-400",
                          )}
                          style={{ width: `${s.load}%` }}
                        />
                      </div>
                      <span className="font-mono text-xs text-muted-foreground">
                        {s.load}%
                      </span>
                    </div>
                  ),
              },
              {
                header: t.admin.servers.cols.ping,
                align: "right",
                cell: (s) =>
                  s.status === "offline" ? (
                    <span className="font-mono text-xs text-muted-foreground">
                      —
                    </span>
                  ) : (
                    <span className="font-mono text-xs">{s.ping} ms</span>
                  ),
              },
              {
                header: t.admin.servers.cols.bandwidth,
                align: "right",
                cell: (s) =>
                  s.bandwidth === 0 ? (
                    <span className="font-mono text-xs text-muted-foreground">
                      —
                    </span>
                  ) : (
                    <span className="font-mono text-xs">
                      {(s.bandwidth / 1000).toFixed(0)} Gbps
                    </span>
                  ),
              },
              {
                header: "",
                align: "right",
                cell: () => (
                  <Button size="sm" variant="ghost" disabled>
                    {t.common.configure}
                  </Button>
                ),
              },
            ]}
          />
        )}
      </div>
    </>
  );
}
