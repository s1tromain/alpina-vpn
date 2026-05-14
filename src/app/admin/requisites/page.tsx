"use client";

import { useCallback, useState } from "react";
import { Plus, Trash2, CreditCard, Wallet, Power, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { GlassCard } from "@/components/shared/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { truncateMiddle } from "@/lib/utils";
import { api, ApiError } from "@/lib/api";
import { useTranslations, format } from "@/hooks/use-translations";
import { useAuthedEffect } from "@/hooks/use-authed-effect";
import type { PaymentRequisite } from "@/types";

/**
 * Admin → Payment requisites.
 *
 * Backed by /api/admin/requisites/* on the Fastify backend. Mutations are
 * optimistic: the UI updates synchronously, then either confirms with the
 * server response or rolls back + toasts on failure. Activate / deactivate
 * uses PATCH (preserves history); the trash icon issues a soft DELETE
 * that the backend refuses while open orders reference the requisite.
 */
export default function AdminRequisitesPage() {
  const t = useTranslations();
  const [items, setItems] = useState<PaymentRequisite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({
    label: "",
    address: "",
    currency: "USDT",
    network: "TRC-20",
    method: "crypto" as PaymentRequisite["method"],
  });

  const refresh = useCallback(async () => {
    try {
      const list = await api.admin.requisites.list();
      setItems(list);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : t.admin.requisites.toastValidation,
      );
    } finally {
      setLoading(false);
    }
  }, [t.admin.requisites.toastValidation]);

  // `useAuthedEffect` waits for `useUserStore.hydrate()` to finish (JWT
  // available) before firing — without this, the fetch can race ahead of
  // the auth handshake and return 401.
  useAuthedEffect(() => {
    void refresh();
  }, [refresh]);

  async function toggle(id: string) {
    const before = items;
    const target = before.find((r) => r.id === id);
    if (!target) return;
    setBusyId(id);
    setItems((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r)),
    );
    try {
      const updated = await api.admin.requisites.update(id, {
        active: !target.active,
      });
      setItems((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      setItems(before); // rollback
      toast.error(err instanceof ApiError ? err.message : t.errors.updateFailed);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(id: string) {
    const before = items;
    setBusyId(id);
    setItems((prev) => prev.filter((r) => r.id !== id));
    try {
      await api.admin.requisites.remove(id);
      toast.success(t.admin.requisites.toastRemoved);
    } catch (err) {
      setItems(before); // rollback
      toast.error(err instanceof ApiError ? err.message : t.errors.deleteFailed);
    } finally {
      setBusyId(null);
    }
  }

  async function add() {
    if (!draft.label || !draft.address) {
      toast.error(t.admin.requisites.toastValidation);
      return;
    }
    setCreating(true);
    try {
      const created = await api.admin.requisites.create({
        method: draft.method,
        label: draft.label,
        address: draft.address,
        currency: draft.currency,
        network: draft.network || undefined,
        active: true,
      });
      setItems((prev) => [created, ...prev]);
      setDraft({
        label: "",
        address: "",
        currency: "USDT",
        network: "TRC-20",
        method: "crypto",
      });
      toast.success(t.admin.requisites.toastAdded);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.errors.createFailed);
    } finally {
      setCreating(false);
    }
  }

  const activeCount = items.filter((r) => r.active).length;
  const disabledCount = items.length - activeCount;

  return (
    <>
      <AdminTopbar
        title={t.admin.requisites.title}
        subtitle={t.admin.requisites.subtitle}
      />

      <div className="p-4 lg:p-8">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {format(t.admin.requisites.countLine, {
              active: activeCount,
              disabled: disabledCount,
            })}
          </p>

          <Dialog>
            <DialogTrigger asChild>
              <Button disabled={creating}>
                {creating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {t.admin.requisites.add}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.admin.requisites.dialog.title}</DialogTitle>
                <DialogDescription>
                  {t.admin.requisites.dialog.description}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <Field label={t.admin.requisites.dialog.label}>
                  <Input
                    placeholder={t.admin.requisites.dialog.labelPlaceholder}
                    value={draft.label}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, label: e.target.value }))
                    }
                  />
                </Field>
                <Field label={t.admin.requisites.dialog.address}>
                  <Input
                    placeholder={t.admin.requisites.dialog.addressPlaceholder}
                    value={draft.address}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, address: e.target.value }))
                    }
                  />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label={t.admin.requisites.dialog.currency}>
                    <Input
                      value={draft.currency}
                      onChange={(e) =>
                        setDraft((d) => ({
                          ...d,
                          currency: e.target.value.toUpperCase(),
                        }))
                      }
                    />
                  </Field>
                  <Field label={t.admin.requisites.dialog.network}>
                    <Input
                      value={draft.network}
                      onChange={(e) =>
                        setDraft((d) => ({ ...d, network: e.target.value }))
                      }
                    />
                  </Field>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <DialogClose asChild>
                  <Button variant="secondary">{t.common.cancel}</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button onClick={add} disabled={creating}>
                    {t.common.create}
                  </Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {items.map((r) => {
              const Icon = r.method === "card" ? CreditCard : Wallet;
              const isBusy = busyId === r.id;
              return (
                <GlassCard key={r.id} className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-silver-light">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{r.label}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {r.currency}
                          {r.network ? ` · ${r.network}` : ""}
                        </p>
                      </div>
                    </div>
                    <Badge variant={r.active ? "success" : "outline"}>
                      {r.active ? t.status.active : t.status.inactive}
                    </Badge>
                  </div>

                  <div className="mt-4 rounded-2xl border border-white/10 bg-graphite-950/40 px-3 py-2.5">
                    <p className="break-all font-mono text-[11px] text-silver-light">
                      {truncateMiddle(r.address, 12, 8)}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => toggle(r.id)}
                      disabled={isBusy}
                    >
                      {isBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Power className="h-3.5 w-3.5" />
                      )}
                      {r.active ? t.common.disable : t.common.enable}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => remove(r.id)}
                      disabled={isBusy}
                      className="text-red-300 hover:text-red-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t.common.remove}
                    </Button>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
