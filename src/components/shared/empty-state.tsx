import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { BrandMark } from "@/components/layout/brand";

interface EmptyStateProps {
  icon?: LucideIcon;
  /** Render the Alpina brand mark instead of an icon (opt-in). */
  brand?: boolean;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  brand = false,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-white/10 bg-white/[0.015] px-6 py-14 text-center",
        className,
      )}
    >
      {brand ? (
        <BrandMark size="lg" glow />
      ) : Icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-muted-foreground">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="mx-auto max-w-sm text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      {action && <div className="pt-2">{action}</div>}
    </div>
  );
}
