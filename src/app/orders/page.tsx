"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Receipt } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { GlassCard } from "@/components/shared/glass-card";
import { EmptyState } from "@/components/shared/empty-state";
import { StatusPill } from "@/components/shared/status-pill";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { api } from "@/lib/api";
import { useResource } from "@/hooks/use-resource";
import { useTranslations, format } from "@/hooks/use-translations";
import { useFormatters } from "@/hooks/use-formatters";
import type { OrderStatus } from "@/types";

type FilterValue = "all" | "active" | "approved" | "rejected";

export default function OrdersPage() {
  const t = useTranslations();
  const { formatCurrency, formatDateTime } = useFormatters();
  // `useResource` defers until the auth handshake has written a JWT,
  // so the fetch never races the splash.
  const { data: ordersData, loading } = useResource(() => api.orders.mine());
  const [filter, setFilter] = useState<FilterValue>("all");

  const orders = useMemo(() => {
    const all = ordersData ?? [];
    return [...all]
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
      .filter((o) => {
        if (filter === "all") return true;
        if (filter === "active")
          return o.status === "pending" || o.status === "processing";
        if (filter === "rejected")
          return (
            o.status === "rejected" ||
            o.status === "expired" ||
            o.status === "cancelled"
          );
        return o.status === (filter satisfies OrderStatus);
      });
  }, [ordersData, filter]);

  const showSkeleton = loading && !ordersData;

  return (
    <AppShell>
      <PageHeader
        title={t.orders.title}
        subtitle={t.orders.subtitle}
        back={false}
      />

      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as FilterValue)}
        className="w-full"
      >
        <TabsList className="w-full justify-between">
          <TabsTrigger value="all" className="flex-1">
            {t.orders.tabs.all}
          </TabsTrigger>
          <TabsTrigger value="active" className="flex-1">
            {t.orders.tabs.active}
          </TabsTrigger>
          <TabsTrigger value="approved" className="flex-1">
            {t.orders.tabs.approved}
          </TabsTrigger>
          <TabsTrigger value="rejected" className="flex-1">
            {t.orders.tabs.rejected}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter}>
          {showSkeleton ? (
            <ul className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-3xl" />
              ))}
            </ul>
          ) : orders.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title={t.orders.emptyTitle}
              description={t.orders.emptyDesc}
            />
          ) : (
            <ul className="space-y-3">
              {orders.map((o, idx) => (
                <motion.li
                  key={o.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <GlassCard className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {format(t.orders.orderN, { id: o.id.slice(-6) })}
                        </p>
                        <p className="mt-1 font-serif text-base">
                          {o.planLabel}
                          {" · "}
                          <span className="text-muted-foreground">
                            {(t.countries as Record<string, string>)[
                              o.countryCode
                            ] ?? o.countryName}
                          </span>
                        </p>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatDateTime(o.createdAt)}
                          {(() => {
                            const refLabel = o.paymentReferenceKey
                              ? t.paymentReferences[o.paymentReferenceKey]
                              : o.paymentReference;
                            return refLabel ? (
                              <>
                                {" · "}
                                <span
                                  className={
                                    o.paymentReferenceKey
                                      ? "italic"
                                      : "font-mono"
                                  }
                                >
                                  {refLabel}
                                </span>
                              </>
                            ) : null;
                          })()}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <p className="font-mono text-sm">
                          {formatCurrency(o.amount, o.currency)}
                        </p>
                        <StatusPill status={o.status} />
                      </div>
                    </div>

                    {(o.noteKey || o.note) && (
                      <p className="mt-3 rounded-xl border border-red-400/15 bg-red-400/[0.04] px-3 py-2 text-[11px] text-red-200/80">
                        {o.noteKey ? t.orderNotes[o.noteKey] : o.note}
                      </p>
                    )}
                  </GlassCard>
                </motion.li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </AppShell>
  );
}
