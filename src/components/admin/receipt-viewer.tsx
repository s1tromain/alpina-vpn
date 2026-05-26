"use client";

import { useEffect, useState } from "react";
import { Download, FileText, Loader2, ImageOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api, ApiError } from "@/lib/api";
import { useFormatters } from "@/hooks/use-formatters";
import type { ReceiptSummary } from "@/types";

interface ReceiptViewerProps {
  orderId: string;
  /** Trigger element rendered inline (e.g. an icon button on the table row). */
  trigger: React.ReactNode;
  /** Optional pre-loaded summary — avoids a fetch on open. */
  initialReceipt?: ReceiptSummary;
}

/**
 * Lightweight modal that lazy-loads the list of receipts for an order and
 * renders the latest one inline. Images preview directly; PDFs surface a
 * download button (cross-browser inline PDF rendering is too inconsistent
 * to bet on for the admin panel).
 *
 * The blob URL is built via `api.admin.receiptFileUrl(id)` which appends
 * the JWT as `?token=…` — required because `<img src>` can't carry a
 * custom Authorization header.
 */
export function ReceiptViewer({
  orderId,
  trigger,
  initialReceipt,
}: ReceiptViewerProps) {
  const { formatDateTime } = useFormatters();
  const [open, setOpen] = useState(false);
  const [list, setList] = useState<ReceiptSummary[]>(
    initialReceipt ? [initialReceipt] : [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    api.admin
      .orderReceipts(orderId)
      .then((items) => {
        if (cancelled) return;
        setList(items);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Не удалось загрузить чеки");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, orderId]);

  const current = list[0];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Receipts · {orderId.slice(-6)}</DialogTitle>
        </DialogHeader>

        {loading && list.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <ImageOff className="h-4 w-4" /> {error}
          </div>
        ) : !current ? (
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-graphite-900/40 px-4 py-3 text-sm text-muted-foreground">
            <ImageOff className="h-4 w-4" /> Чек ещё не загружен.
          </div>
        ) : (
          <div className="space-y-4">
            <ReceiptPreview receipt={current} />

            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
              <div className="space-y-0.5">
                <p>
                  <span className="font-mono">{current.id.slice(-8)}</span> ·{" "}
                  {(current.sizeBytes / 1024).toFixed(1)} KB · {current.mimeType}
                </p>
                <p>Загружено: {formatDateTime(current.createdAt)}</p>
              </div>
              <Button asChild size="sm" variant="secondary">
                <a
                  href={api.admin.receiptFileUrl(current.id)}
                  download
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <Download className="mr-2 h-3.5 w-3.5" /> Скачать
                </a>
              </Button>
            </div>

            {list.length > 1 && (
              <div className="space-y-2 border-t border-white/10 pt-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                  Предыдущие версии ({list.length - 1})
                </p>
                <ul className="space-y-1 text-xs">
                  {list.slice(1).map((r) => (
                    <li
                      key={r.id}
                      className="flex items-center justify-between gap-2 rounded-lg bg-graphite-900/40 px-3 py-2"
                    >
                      <span className="font-mono">{r.id.slice(-8)}</span>
                      <span className="text-muted-foreground">
                        {formatDateTime(r.createdAt)}
                      </span>
                      <a
                        className="text-primary hover:underline"
                        href={api.admin.receiptFileUrl(r.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Открыть
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ReceiptPreview({ receipt }: { receipt: ReceiptSummary }) {
  const url = api.admin.receiptFileUrl(receipt.id);
  const isImage = receipt.mimeType.startsWith("image/");
  const [broken, setBroken] = useState(false);

  if (!isImage) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-white/10 bg-graphite-900/40 px-6 py-10 text-center">
        <FileText className="h-10 w-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Файл <code>{receipt.mimeType}</code> нельзя показать в браузере.
          Используйте кнопку «Скачать».
        </p>
      </div>
    );
  }

  if (broken) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        <ImageOff className="h-4 w-4" /> Не удалось загрузить изображение
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-graphite-900/40">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={`Receipt ${receipt.id}`}
        className="max-h-[60vh] w-full object-contain"
        onError={() => setBroken(true)}
      />
    </div>
  );
}
