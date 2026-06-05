"use client";

import { useMemo, useState } from "react";
import { Search, Crown, ShieldCheck, Loader2, Ban, Check } from "lucide-react";
import { toast } from "sonner";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { DataTable } from "@/components/admin/data-table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/hooks/use-resource";
import { useAdminStore } from "@/stores/admin-store";
import { shortName } from "@/lib/utils";
import { useFormatters } from "@/hooks/use-formatters";
import { useTranslations, format } from "@/hooks/use-translations";
import type { User, UserRole } from "@/types";

export default function AdminUsersPage() {
  const t = useTranslations();
  const { formatDate, relativeTime } = useFormatters();
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<UserRole | "all">("all");

  const me = useAdminStore((s) => s.admin);
  const canManage = me?.role === "admin";

  // Server-side search via the backend's ?search= param. Pagination is
  // hard-capped at 200 — wire to a paginated table once the user count
  // outgrows that.
  const { data, loading, refresh } = useResource(
    () =>
      api.admin.users({
        take: 200,
        search: query.trim() ? query.trim() : undefined,
      }),
    { deps: [query] },
  );

  const users = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(
    () => (role === "all" ? users : users.filter((u) => u.role === role)),
    [users, role],
  );

  // Per-row in-flight flag so we can disable the row's controls while a
  // mutation is pending.
  const [busyId, setBusyId] = useState<string | null>(null);

  async function changeRole(u: User, next: UserRole) {
    if (next === u.role) return;
    setBusyId(u.id);
    try {
      await api.admin.setUserRole(u.id, next);
      toast.success(format(t.admin.users.toastRoleChanged, { role: t.roles[next] }));
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.errors.updateFailed);
    } finally {
      setBusyId(null);
    }
  }

  async function toggleBan(u: User) {
    setBusyId(u.id);
    try {
      await api.admin.setUserBan(u.id, !u.banned);
      toast.success(
        u.banned ? t.admin.users.toastUnblocked : t.admin.users.toastBlocked,
      );
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.errors.updateFailed);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <AdminTopbar
        title={t.admin.users.title}
        subtitle={format(t.admin.users.subtitle, { n: users.length })}
      />

      <div className="p-4 lg:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs value={role} onValueChange={(v) => setRole(v as typeof role)}>
            <TabsList>
              <TabsTrigger value="all">{t.admin.users.tabs.all}</TabsTrigger>
              <TabsTrigger value="user">{t.admin.users.tabs.users}</TabsTrigger>
              <TabsTrigger value="operator">{t.admin.users.tabs.operators}</TabsTrigger>
              <TabsTrigger value="admin">{t.admin.users.tabs.admins}</TabsTrigger>
            </TabsList>
            <TabsContent value={role} />
          </Tabs>

          <div className="flex items-center gap-3">
            <div className="relative flex-1 lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t.admin.users.search}
                className="pl-9 lg:w-80"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <Button variant="secondary" disabled>
              {t.common.exportCsv}
            </Button>
          </div>
        </div>

        {loading && users.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <DataTable
            data={filtered}
            rowKey={(u) => u.id}
            columns={[
              {
                header: t.admin.users.cols.member,
                cell: (u) => (
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-white/10 to-transparent font-serif text-xs text-silver-light">
                      {shortName(u.firstName, u.lastName)}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {u.firstName} {u.lastName ?? ""}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        @{u.username}
                      </p>
                    </div>
                  </div>
                ),
              },
              {
                header: t.admin.users.cols.telegramId,
                cell: (u) => (
                  <span className="font-mono text-xs text-muted-foreground">
                    {u.telegramId}
                  </span>
                ),
              },
              {
                header: t.admin.users.cols.role,
                cell: (u) => (
                  <div className="flex items-center gap-2">
                    {u.role === "admin" ? (
                      <Badge variant="premium">
                        <ShieldCheck className="h-3 w-3" /> {t.roles.admin}
                      </Badge>
                    ) : u.role === "operator" ? (
                      <Badge variant="warning">{t.roles.operator}</Badge>
                    ) : (
                      <Badge variant="outline">{t.roles.member}</Badge>
                    )}
                    {u.banned && (
                      <Badge variant="destructive">
                        <Ban className="h-3 w-3" /> {t.admin.users.blocked}
                      </Badge>
                    )}
                  </div>
                ),
              },
              {
                header: t.admin.users.cols.tier,
                cell: (u) =>
                  u.isPremium ? (
                    <Badge variant="premium">
                      <Crown className="h-3 w-3" /> {t.roles.premium}
                    </Badge>
                  ) : (
                    <Badge variant="outline">{t.roles.standard}</Badge>
                  ),
              },
              {
                header: t.admin.users.cols.registered,
                cell: (u) => (
                  <span className="text-xs text-muted-foreground">
                    {formatDate(u.registeredAt)}
                  </span>
                ),
              },
              {
                header: t.admin.users.cols.lastSeen,
                cell: (u) => (
                  <span className="text-xs text-muted-foreground">
                    {u.lastSeenAt ? relativeTime(u.lastSeenAt) : "—"}
                  </span>
                ),
              },
              {
                header: "",
                align: "right",
                cell: (u) => {
                  // Role management is admin-only (backend enforces too), and
                  // an admin can't change/block their own account.
                  if (!canManage || u.id === me?.id) {
                    return (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    );
                  }
                  const isBusy = busyId === u.id;
                  return (
                    <div className="flex items-center justify-end gap-2">
                      <select
                        aria-label={t.admin.users.cols.role}
                        value={u.role}
                        disabled={isBusy}
                        onChange={(e) =>
                          void changeRole(u, e.target.value as UserRole)
                        }
                        className="rounded-lg border border-white/10 bg-graphite-950/60 px-2 py-1.5 text-xs outline-none focus:border-white/20 disabled:opacity-50"
                      >
                        <option value="user">{t.roles.member}</option>
                        <option value="operator">{t.roles.operator}</option>
                        <option value="admin">{t.roles.admin}</option>
                      </select>
                      <Button
                        size="sm"
                        variant={u.banned ? "secondary" : "ghost"}
                        disabled={isBusy}
                        onClick={() => void toggleBan(u)}
                        className={u.banned ? "" : "text-red-300 hover:text-red-200"}
                      >
                        {isBusy ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : u.banned ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Ban className="h-3.5 w-3.5" />
                        )}
                        {u.banned
                          ? t.admin.users.unblock
                          : t.admin.users.block}
                      </Button>
                    </div>
                  );
                },
              },
            ]}
          />
        )}
      </div>
    </>
  );
}
