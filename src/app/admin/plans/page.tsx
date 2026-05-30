"use client";

import { useCallback, useState } from "react";
import { Plus, Loader2, Power, Pencil, Package } from "lucide-react";
import { toast } from "sonner";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { GlassCard } from "@/components/shared/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";
import { api, ApiError } from "@/lib/api";
import { useTranslations, format } from "@/hooks/use-translations";
import { useAuthedEffect } from "@/hooks/use-authed-effect";
import type { Plan } from "@/types";

const GB = 1024 ** 3;
const TIERS: Plan["tier"][] = ["starter", "standard", "premium"];
const BADGES = ["", "popular", "best-value"] as const;

interface Draft {
  slug: string;
  tier: Plan["tier"];
  label: string;
  priceUsd: string;
  durationDays: string;
  trafficGb: string;
  maxDevices: string;
  features: string;
  badge: string;
  sortOrder: string;
}

const EMPTY_DRAFT: Draft = {
  slug: "",
  tier: "starter",
  label: "",
  priceUsd: "",
  durationDays: "30",
  trafficGb: "",
  maxDevices: "3",
  features: "",
  badge: "",
  sortOrder: "0",
};

export default function AdminPlansPage() {
  const t = useTranslations();
  const d = t.admin.plans.dialog;
  const [items, setItems] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);

  const refresh = useCallback(async () => {
    try {
      setItems(await api.admin.plans.list());
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.errors.loadFailed);
    } finally {
      setLoading(false);
    }
  }, [t.errors.loadFailed]);

  useAuthedEffect(() => {
    void refresh();
  }, [refresh]);

  function openCreate() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setOpen(true);
  }

  function openEdit(p: Plan) {
    setEditingId(p.id);
    setDraft({
      slug: p.slug,
      tier: p.tier,
      label: p.label,
      priceUsd: String(p.priceUsd),
      durationDays: String(p.durationDays),
      trafficGb: p.trafficLimit == null ? "" : String(Math.round(p.trafficLimit / GB)),
      maxDevices: String(p.maxDevices),
      features: p.features.join("\n"),
      badge: p.badge ?? "",
      sortOrder: String(p.sortOrder ?? 0),
    });
    setOpen(true);
  }

  async function toggle(p: Plan) {
    setBusyId(p.id);
    const before = items;
    try {
      const updated = await api.admin.plans.update(p.id, { active: !isActive(p) });
      setItems((prev) => prev.map((x) => (x.id === p.id ? updated : x)));
    } catch (err) {
      setItems(before);
      toast.error(err instanceof ApiError ? err.message : t.errors.updateFailed);
    } finally {
      setBusyId(null);
    }
  }

  async function save() {
    if (!draft.slug || !draft.label || !draft.priceUsd) {
      toast.error(t.admin.plans.toastValidation);
      return;
    }
    setSaving(true);
    const trafficGb = draft.trafficGb.trim() === "" ? null : Number(draft.trafficGb);
    const features = draft.features
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean);
    const base = {
      slug: draft.slug.trim(),
      tier: draft.tier,
      label: draft.label.trim(),
      priceUsd: Number(draft.priceUsd),
      durationDays: Number(draft.durationDays) || 30,
      trafficGb,
      maxDevices: Number(draft.maxDevices) || 1,
      features,
      badge: draft.badge ? draft.badge : null,
      sortOrder: Number(draft.sortOrder) || 0,
    };
    try {
      if (editingId) {
        const updated = await api.admin.plans.update(editingId, base);
        setItems((prev) => prev.map((p) => (p.id === editingId ? updated : p)));
        toast.success(t.admin.plans.toastSaved);
      } else {
        const created = await api.admin.plans.create({ ...base, active: true });
        setItems((prev) => [...prev, created]);
        toast.success(t.admin.plans.toastAdded);
      }
      setOpen(false);
      setDraft(EMPTY_DRAFT);
      setEditingId(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t.errors.createFailed);
    } finally {
      setSaving(false);
    }
  }

  const activeCount = items.filter(isActive).length;
  const disabledCount = items.length - activeCount;

  return (
    <>
      <AdminTopbar title={t.admin.plans.title} subtitle={t.admin.plans.subtitle} />

      <div className="p-4 lg:p-8">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {format(t.admin.plans.countLine, {
              active: activeCount,
              disabled: disabledCount,
            })}
          </p>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t.admin.plans.add}
          </Button>
        </div>

        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((p) => {
              const isBusy = busyId === p.id;
              const badgeLabel = p.badge
                ? (t.planBadges as Record<string, string>)[p.badge] ?? p.badge
                : null;
              const trafficLabel =
                p.trafficLimit == null
                  ? t.admin.plans.unlimitedTraffic
                  : `${Math.round(p.trafficLimit / GB)}`;
              return (
                <GlassCard key={p.id} className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-silver-light">
                        <Package className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{p.label}</p>
                          {badgeLabel && (
                            <Badge variant="outline">{badgeLabel}</Badge>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground">{p.slug}</p>
                      </div>
                    </div>
                    <Badge variant={isActive(p) ? "success" : "outline"}>
                      {isActive(p) ? t.status.active : t.status.inactive}
                    </Badge>
                  </div>

                  <p className="mt-4 font-serif text-2xl tracking-tight">
                    {formatCurrency(p.priceUsd)}
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {format(t.admin.plans.perPlan, {
                      gb: trafficLabel,
                      days: p.durationDays,
                      devices: p.maxDevices,
                    })}
                  </p>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(p)}
                      disabled={isBusy}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t.common.edit}
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => toggle(p)}
                      disabled={isBusy}
                    >
                      {isBusy ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Power className="h-3.5 w-3.5" />
                      )}
                      {isActive(p) ? t.common.disable : t.common.enable}
                    </Button>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? d.editTitle : d.title}</DialogTitle>
            <DialogDescription>{d.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label={d.slug}>
                <Input
                  placeholder={d.slugPlaceholder}
                  value={draft.slug}
                  onChange={(e) =>
                    setDraft((s) => ({ ...s, slug: e.target.value.toLowerCase() }))
                  }
                />
              </Field>
              <Field label={d.tier}>
                <select
                  value={draft.tier}
                  onChange={(e) =>
                    setDraft((s) => ({ ...s, tier: e.target.value as Plan["tier"] }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-graphite-950/40 px-3 py-2 text-sm outline-none focus:border-white/20"
                >
                  {TIERS.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label={d.label}>
              <Input
                placeholder={d.labelPlaceholder}
                value={draft.label}
                onChange={(e) => setDraft((s) => ({ ...s, label: e.target.value }))}
              />
            </Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label={d.priceUsd}>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={draft.priceUsd}
                  onChange={(e) =>
                    setDraft((s) => ({ ...s, priceUsd: e.target.value }))
                  }
                />
              </Field>
              <Field label={d.durationDays}>
                <Input
                  type="number"
                  value={draft.durationDays}
                  onChange={(e) =>
                    setDraft((s) => ({ ...s, durationDays: e.target.value }))
                  }
                />
              </Field>
              <Field label={d.trafficGb}>
                <Input
                  type="number"
                  placeholder={d.trafficUnlimited}
                  value={draft.trafficGb}
                  onChange={(e) =>
                    setDraft((s) => ({ ...s, trafficGb: e.target.value }))
                  }
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={d.maxDevices}>
                <Input
                  type="number"
                  value={draft.maxDevices}
                  onChange={(e) =>
                    setDraft((s) => ({ ...s, maxDevices: e.target.value }))
                  }
                />
              </Field>
              <Field label={d.badge}>
                <select
                  value={draft.badge}
                  onChange={(e) =>
                    setDraft((s) => ({ ...s, badge: e.target.value }))
                  }
                  className="w-full rounded-xl border border-white/10 bg-graphite-950/40 px-3 py-2 text-sm outline-none focus:border-white/20"
                >
                  {BADGES.map((b) => (
                    <option key={b || "none"} value={b}>
                      {b === ""
                        ? t.admin.plans.badgeNone
                        : b === "popular"
                          ? t.admin.plans.badgePopular
                          : t.admin.plans.badgeBestValue}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            <Field label={d.features}>
              <textarea
                rows={3}
                value={draft.features}
                onChange={(e) =>
                  setDraft((s) => ({ ...s, features: e.target.value }))
                }
                className="w-full rounded-xl border border-white/10 bg-graphite-950/40 px-3 py-2 text-sm outline-none focus:border-white/20"
              />
            </Field>
            <Field label={d.sortOrder}>
              <Input
                type="number"
                value={draft.sortOrder}
                onChange={(e) =>
                  setDraft((s) => ({ ...s, sortOrder: e.target.value }))
                }
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <DialogClose asChild>
              <Button variant="secondary" disabled={saving}>
                {t.common.cancel}
              </Button>
            </DialogClose>
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t.common.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// The public Plan DTO doesn't carry `active` (only active plans are public),
// but the admin list returns every plan; we treat a returned plan as active
// unless the backend later adds the flag. Admin list uses the same DTO, so we
// rely on the toggle round-trip returning the fresh row.
function isActive(p: Plan & { active?: boolean }): boolean {
  return p.active ?? true;
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
