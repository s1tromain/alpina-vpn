"use client";

import { useMemo, useState } from "react";
import { Check, X, Search, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { DataTable } from "@/components/admin/data-table";
import { ReceiptViewer } from "@/components/admin/receipt-viewer";
import { RejectOrderDialog } from "@/components/admin/reject-order-dialog";
import { StatusPill } from "@/components/shared/status-pill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { api, ApiError } from "@/lib/api";
import { useResource } from "@/hooks/use-resource";
import { useTranslations, format } from "@/hooks/use-translations";
import { useFormatters } from "@/hooks/use-formatters";
import type { Order, OrderNoteKey, OrderStatus } from "@/types";

type Filter = "all" | "pending" | "processing" | "approved" | "rejected";

export default function AdminOrdersPage() {
  const t = useTranslations();
  const { formatCurrency, formatDateTime } = useFormatters();

  // We fetch the full list once and filter client-side. The backend's
  // `/admin/orders` honours `?status=` for server-side filtering once the
  // list grows past a few hundred — easy swap.
  const { data, loading, refresh } = useResource(() =>
    api.admin.orders({ take: 200 }),
  );

  const [tab, setTab] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<Record<string, OrderStatus | null>>({});

  const orders = useMemo(() => data ?? [], [data]);

  const filtered = useMemo(() => {
    return orders
      .filter((o) => {
        if (tab === "all") return true;
        // Successful approvals settle as `active` — surface them under the
        // "approved" tab so the queue reflects fulfilled orders.
        if (tab === "approved")
          return o.status === "approved" || o.status === "active";
        return o.status === tab;
      })
      .filter((o) => {
        const s = q.trim().toLowerCase();
        if (!s) return true;
        return (
          o.username.toLowerCase().includes(s) ||
          o.id.toLowerCase().includes(s) ||
          o.countryName.toLowerCase().includes(s)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [orders, tab, q]);

  async function update(
    id: string,
    status: OrderStatus,
    extra: { note?: string; noteKey?: OrderNoteKey } = {},
  ) {
    setBusy((prev) => ({ ...prev, [id]: status }));
    try {
      await api.admin.setOrderStatus(id, { status, ...extra });
      const shortId = id.slice(-6);
      const msg =
        status === "approved"
          ? format(t.admin.orders.toastApproved, { id: shortId })
          : format(t.admin.orders.toastRejected, { id: shortId });
      toast.success(msg);
      // Refresh the whole list so derived counters + recent panel are in
      // sync. Cheap (single SELECT, capped at 200 rows).
      await refresh();
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t.errors.updateFailed,
      );
    } finally {
      setBusy((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  function actionFor(o: Order) {
    const pending = busy[o.id];
    const hasReceipts = (o.receiptCount ?? 0) > 0;
    const receiptBtn = hasReceipts ? (
      <ReceiptViewer
        orderId={o.id}
        initialReceipt={o.latestReceipt}
        trigger={
          <Button size="sm" variant="ghost" title="Просмотреть чек">
            <FileText className="h-3.5 w-3.5" />
          </Button>
        }
      />
    ) : null;

    if (
      o.status === "created" ||
      o.status === "pending" ||
      o.status === "processing"
    ) {
      return (
        <div className="flex justify-end gap-2">
          {receiptBtn}
          <Button
            size="sm"
            onClick={() => void update(o.id, "approved")}
            disabled={!!pending}
          >
            {pending === "approved" ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Check className="h-3.5 w-3.5" />
            )}
            {t.admin.orders.approve}
          </Button>
          <RejectOrderDialog
            orderId={o.id}
            onConfirm={(body) => update(o.id, "rejected", body)}
            trigger={
              <Button size="sm" variant="secondary" disabled={!!pending}>
                {pending === "rejected" ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
                {t.admin.orders.reject}
              </Button>
            }
          />
        </div>
      );
    }
    return (
      <div className="flex justify-end gap-2">
        {receiptBtn}
        <Button size="sm" variant="ghost">
          {t.common.view}
        </Button>
      </div>
    );
  }

  return (
    <>
      <AdminTopbar
        title={t.admin.orders.title}
        subtitle={t.admin.orders.subtitle}
      />

      <div className="p-4 lg:p-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs value={tab} onValueChange={(v) => setTab(v as Filter)}>
            <TabsList>
              <TabsTrigger value="all">{t.admin.orders.tabs.all}</TabsTrigger>
              <TabsTrigger value="pending">{t.admin.orders.tabs.pending}</TabsTrigger>
              <TabsTrigger value="processing">{t.admin.orders.tabs.processing}</TabsTrigger>
              <TabsTrigger value="approved">{t.admin.orders.tabs.approved}</TabsTrigger>
              <TabsTrigger value="rejected">{t.admin.orders.tabs.rejected}</TabsTrigger>
            </TabsList>
            <TabsContent value={tab} />
          </Tabs>

          <div className="relative flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t.admin.orders.search}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {loading && orders.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <DataTable
            data={filtered}
            rowKey={(o) => o.id}
            columns={[
              {
                header: t.admin.orders.cols.order,
                cell: (o) => (
                  <div>
                    <p className="font-mono text-xs">#{o.id.slice(-6)}</p>
                    <p className="text-[11px] text-muted-foreground">
                      @{o.username}
                    </p>
                  </div>
                ),
              },
              {
                header: t.admin.orders.cols.plan,
                cell: (o) => {
                  const countryName =
                    (t.countries as Record<string, string>)[o.countryCode] ??
                    o.countryName;
                  return (
                    <div>
                      <p className="text-sm font-medium">{o.planLabel}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {countryName}
                      </p>
                    </div>
                  );
                },
              },
              {
                header: t.admin.orders.cols.amount,
                align: "right",
                cell: (o) => (
                  <span className="font-mono text-sm">
                    {formatCurrency(o.amount, o.currency)}
                  </span>
                ),
              },
              {
                header: t.admin.orders.cols.created,
                cell: (o) => (
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(o.createdAt)}
                  </span>
                ),
              },
              {
                header: t.admin.orders.cols.status,
                cell: (o) => <StatusPill status={o.status} />,
              },
              {
                header: "",
                align: "right",
                cell: actionFor,
              },
            ]}
          />
        )}
      </div>
    </>
  );
}
