"use client";

import { cn } from "@/lib/utils";
import { useTranslations } from "@/hooks/use-translations";
import type { OrderStatus } from "@/types";
import {
  Ban,
  CalendarX,
  CheckCircle2,
  Clock,
  FileClock,
  Loader2,
  Wifi,
  XCircle,
} from "lucide-react";

const styles: Record<
  OrderStatus,
  { cls: string; icon: typeof Clock; spin?: boolean }
> = {
  created: {
    cls: "border-white/10 bg-white/[0.04] text-muted-foreground",
    icon: FileClock,
  },
  pending: {
    cls: "border-amber-400/20 bg-amber-400/[0.08] text-amber-300",
    icon: Clock,
  },
  processing: {
    cls: "border-sky-400/20 bg-sky-400/[0.08] text-sky-300",
    icon: Loader2,
    spin: true,
  },
  approved: {
    cls: "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300",
    icon: CheckCircle2,
  },
  active: {
    cls: "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-300",
    icon: Wifi,
  },
  rejected: {
    cls: "border-red-400/20 bg-red-400/[0.08] text-red-300",
    icon: XCircle,
  },
  expired: {
    cls: "border-white/10 bg-white/[0.04] text-muted-foreground",
    icon: CalendarX,
  },
  cancelled: {
    cls: "border-white/10 bg-white/[0.04] text-muted-foreground",
    icon: Ban,
  },
};

export function StatusPill({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  const t = useTranslations();
  const entry = styles[status];
  const Icon = entry.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em]",
        entry.cls,
        className,
      )}
    >
      <Icon className={cn("h-3 w-3", entry.spin && "animate-spin")} />
      {t.status[status]}
    </span>
  );
}
