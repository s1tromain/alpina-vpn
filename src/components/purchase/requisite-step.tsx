"use client";

import { useRef } from "react";
import { Copy, ShieldCheck, UploadCloud, FileCheck2, Building2, User } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/shared/glass-card";
import { formatCurrency } from "@/lib/utils";
import { useCopy } from "@/hooks/use-copy";
import { useTranslations } from "@/hooks/use-translations";
import type { PaymentRequisite } from "@/types";

interface Props {
  requisite: PaymentRequisite;
  amount: number;
  file: File | null;
  onFileChange: (file: File | null) => void;
  uploading: boolean;
}

const ACCEPT = "image/jpeg,image/png,image/webp,application/pdf";

/**
 * Pay & confirm step: shows the single active payment card (number, owner,
 * bank, optional QR, instructions) and lets the user attach a receipt. The
 * parent owns the actual upload — this component only surfaces the card and
 * lifts the chosen file up via `onFileChange`.
 */
export function PayStep({ requisite, amount, file, onFileChange, uploading }: Props) {
  const t = useTranslations();
  const { copy } = useCopy();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <GlassCard accent="premium" className="p-5">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          <span>{t.purchase.amountDue}</span>
          <span>{requisite.title}</span>
        </div>
        <p className="mt-2 font-serif text-3xl tracking-tight text-foreground">
          {formatCurrency(amount)}
        </p>

        <div className="mt-4 space-y-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            {t.purchase.cardNumberLabel}
          </p>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-graphite-950/40 px-3.5 py-3">
            <p className="flex-1 break-all font-mono text-[15px] tracking-wide text-silver-light">
              {requisite.cardNumber}
            </p>
            <Button
              variant="secondary"
              size="icon"
              onClick={() => copy(requisite.cardNumber, t.purchase.cardCopied)}
              aria-label={t.purchase.copyCard}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <Detail icon={<User className="h-3.5 w-3.5" />} label={t.purchase.ownerLabel} value={requisite.ownerName} />
          <Detail icon={<Building2 className="h-3.5 w-3.5" />} label={t.purchase.bankLabel} value={requisite.bankName} />
        </div>

        {requisite.qrImage && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {t.purchase.scanQr}
            </p>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-white p-2">
              {/* QR may be a data: or remote URL; unoptimized keeps it simple. */}
              <Image
                src={requisite.qrImage}
                alt={t.purchase.scanQr}
                width={160}
                height={160}
                unoptimized
                className="h-40 w-40 object-contain"
              />
            </div>
          </div>
        )}

        {requisite.instructions && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-amber-400/15 bg-amber-400/[0.04] p-3 text-[11px] leading-relaxed text-amber-200/90">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>{requisite.instructions}</p>
          </div>
        )}
      </GlassCard>

      <GlassCard className="p-5">
        <p className="text-sm font-medium text-foreground">{t.purchase.uploadTitle}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{t.purchase.uploadHint}</p>

        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
        />

        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-4 text-left transition-all hover:bg-white/[0.04] disabled:opacity-60"
        >
          {file ? (
            <FileCheck2 className="h-5 w-5 shrink-0 text-emerald-300" />
          ) : (
            <UploadCloud className="h-5 w-5 shrink-0 text-silver-light" />
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-foreground">
              {file ? file.name : t.purchase.uploadCta}
            </span>
            {file && (
              <span className="block text-[11px] text-muted-foreground">
                {t.purchase.uploadChange}
              </span>
            )}
          </span>
        </button>
      </GlassCard>
    </div>
  );
}

function Detail({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 truncate text-sm font-medium text-foreground">{value}</p>
    </div>
  );
}
