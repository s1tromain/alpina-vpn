"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { OrderNoteKey } from "@/types";

interface RejectOrderDialogProps {
  orderId: string;
  trigger: React.ReactNode;
  onConfirm: (body: { note?: string; noteKey?: OrderNoteKey }) => Promise<void>;
}

const PRESET_REASONS: { key: OrderNoteKey; label: string }[] = [
  { key: "paymentNotReceived", label: "Платёж не получен" },
  { key: "cancelledByCustomer", label: "Отменено клиентом" },
];

/**
 * Two-step reject UI: pick a preset reason OR type a free-form one. The
 * preset key is persisted on the order as `noteKey` so the Mini App can
 * render the localized version; the free-form text lives in `note`.
 *
 * Confirmation is deliberately required — accidental rejections rip a
 * VPN provisioning out from under a paying user.
 */
export function RejectOrderDialog({
  orderId,
  trigger,
  onConfirm,
}: RejectOrderDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<OrderNoteKey | "custom" | null>(
    null,
  );
  const [customText, setCustomText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    setBusy(true);
    setError(null);
    try {
      if (selectedKey === "custom") {
        const note = customText.trim();
        if (!note) throw new Error("Введите причину");
        await onConfirm({ note });
      } else if (selectedKey) {
        await onConfirm({ noteKey: selectedKey });
      } else {
        await onConfirm({});
      }
      setOpen(false);
      // Reset for next open.
      setSelectedKey(null);
      setCustomText("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось отклонить");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Отклонить заказ #{orderId.slice(-6)}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {PRESET_REASONS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setSelectedKey(r.key)}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
                selectedKey === r.key
                  ? "border-primary bg-primary/10"
                  : "border-white/10 bg-graphite-900/40 hover:border-white/20"
              }`}
            >
              {r.label}
            </button>
          ))}

          <button
            type="button"
            onClick={() => setSelectedKey("custom")}
            className={`w-full rounded-xl border px-4 py-3 text-left text-sm transition ${
              selectedKey === "custom"
                ? "border-primary bg-primary/10"
                : "border-white/10 bg-graphite-900/40 hover:border-white/20"
            }`}
          >
            Другая причина
          </button>

          {selectedKey === "custom" && (
            <Input
              autoFocus
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="Опишите причину для пользователя"
              maxLength={500}
            />
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
              Отмена
            </Button>
            <Button
              variant="destructive"
              disabled={busy || !selectedKey}
              onClick={() => void handleConfirm()}
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Подтвердить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
