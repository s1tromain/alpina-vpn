"use client";

import { useCallback, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  CreditCard,
  Power,
  Loader2,
  Pencil,
  ImageUp,
} from "lucide-react";
import Image from "next/image";
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
import { maskCard } from "@/lib/utils";
import { api, ApiError } from "@/lib/api";
import { useTranslations, format } from "@/hooks/use-translations";
import { useAuthedEffect } from "@/hooks/use-authed-effect";
import type { PaymentRequisite } from "@/types";

interface Draft {
  title: string;
  cardNumber: string;
  ownerName: string;
  bankName: string;
  qrImage: string;
  instructions: string;
}

const EMPTY_DRAFT: Draft = {
  title: "",
  cardNumber: "",
  ownerName: "",
  bankName: "",
  qrImage: "",
  instructions: "",
};

/**
 * Admin → Payment requisites (cards).
 *
 * Backed by /api/admin/requisites/* on the Fastify backend. The single active
 * requisite is the card shown to users at checkout. Toggle uses PATCH (keeps
 * history); the trash icon soft-deletes (refused while open orders reference
 * it). QR images are stored as a URL or a client-converted data URL.
 */
export default function AdminRequisitesPage() {
  const t = useTranslations();
  const d = t.admin.requisites.dialog;
  const [items, setItems] = useState<PaymentRequisite[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const qrInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    try {
      const list = await api.admin.requisites.list();
      setItems(list);
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

  function openEdit(r: PaymentRequisite) {
    setEditingId(r.id);
    setDraft({
      title: r.title,
      cardNumber: r.cardNumber,
      ownerName: r.ownerName,
      bankName: r.bankName,
      qrImage: r.qrImage ?? "",
      instructions: r.instructions ?? "",
    });
    setOpen(true);
  }

  async function onQrFile(file: File | null) {
    if (!file) return;
    if (file.size > 1_000_000) {
      toast.error("QR image must be under 1 MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () =>
      setDraft((prev) => ({ ...prev, qrImage: String(reader.result) }));
    reader.readAsDataURL(file);
  }

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
      setItems(before);
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
      setItems(before);
      toast.error(err instanceof ApiError ? err.message : t.errors.deleteFailed);
    } finally {
      setBusyId(null);
    }
  }

  async function save() {
    if (!draft.title || !draft.cardNumber || !draft.ownerName || !draft.bankName) {
      toast.error(t.admin.requisites.toastValidation);
      return;
    }
    setSaving(true);
    const payload = {
      title: draft.title,
      cardNumber: draft.cardNumber,
      ownerName: draft.ownerName,
      bankName: draft.bankName,
      qrImage: draft.qrImage || null,
      instructions: draft.instructions || null,
    };
    try {
      if (editingId) {
        const updated = await api.admin.requisites.update(editingId, payload);
        setItems((prev) => prev.map((r) => (r.id === editingId ? updated : r)));
        toast.success(t.admin.requisites.toastSaved);
      } else {
        const created = await api.admin.requisites.create({
          ...payload,
          qrImage: draft.qrImage || undefined,
          instructions: draft.instructions || undefined,
          active: true,
        });
        setItems((prev) => [created, ...prev]);
        toast.success(t.admin.requisites.toastAdded);
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
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t.admin.requisites.add}
          </Button>
        </div>

        {loading && items.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {items.map((r) => {
              const isBusy = busyId === r.id;
              return (
                <GlassCard key={r.id} className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] text-silver-light">
                        <CreditCard className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{r.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {r.bankName} · {r.ownerName}
                        </p>
                      </div>
                    </div>
                    <Badge variant={r.active ? "success" : "outline"}>
                      {r.active ? t.status.active : t.status.inactive}
                    </Badge>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex-1 rounded-2xl border border-white/10 bg-graphite-950/40 px-3 py-2.5">
                      <p className="font-mono text-[13px] tracking-wide text-silver-light">
                        {maskCard(r.cardNumber)}
                      </p>
                    </div>
                    {r.qrImage && (
                      <div className="overflow-hidden rounded-xl border border-white/10 bg-white p-1">
                        <Image
                          src={r.qrImage}
                          alt="QR"
                          width={44}
                          height={44}
                          unoptimized
                          className="h-11 w-11 object-contain"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(r)}
                      disabled={isBusy}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      {t.common.edit}
                    </Button>
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
            <Field label={d.cardTitle}>
              <Input
                placeholder={d.cardTitlePlaceholder}
                value={draft.title}
                onChange={(e) => setDraft((s) => ({ ...s, title: e.target.value }))}
              />
            </Field>
            <Field label={d.cardNumber}>
              <Input
                placeholder={d.cardNumberPlaceholder}
                value={draft.cardNumber}
                onChange={(e) =>
                  setDraft((s) => ({ ...s, cardNumber: e.target.value }))
                }
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={d.ownerName}>
                <Input
                  placeholder={d.ownerNamePlaceholder}
                  value={draft.ownerName}
                  onChange={(e) =>
                    setDraft((s) => ({ ...s, ownerName: e.target.value }))
                  }
                />
              </Field>
              <Field label={d.bankName}>
                <Input
                  placeholder={d.bankNamePlaceholder}
                  value={draft.bankName}
                  onChange={(e) =>
                    setDraft((s) => ({ ...s, bankName: e.target.value }))
                  }
                />
              </Field>
            </div>
            <Field label={d.qrImage}>
              <div className="flex items-center gap-2">
                <Input
                  placeholder={d.qrImagePlaceholder}
                  value={draft.qrImage.startsWith("data:") ? "" : draft.qrImage}
                  onChange={(e) =>
                    setDraft((s) => ({ ...s, qrImage: e.target.value }))
                  }
                />
                <input
                  ref={qrInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => void onQrFile(e.target.files?.[0] ?? null)}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={() => qrInputRef.current?.click()}
                  aria-label={d.qrUpload}
                >
                  <ImageUp className="h-4 w-4" />
                </Button>
              </div>
              {draft.qrImage && (
                <p className="mt-1 text-[10px] text-muted-foreground">
                  {draft.qrImage.startsWith("data:")
                    ? "Image attached"
                    : draft.qrImage}
                </p>
              )}
            </Field>
            <Field label={d.instructions}>
              <textarea
                rows={3}
                placeholder={d.instructionsPlaceholder}
                value={draft.instructions}
                onChange={(e) =>
                  setDraft((s) => ({ ...s, instructions: e.target.value }))
                }
                className="w-full rounded-xl border border-white/10 bg-graphite-950/40 px-3 py-2 text-sm outline-none focus:border-white/20"
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
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              {t.common.save}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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
