"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { haptic } from "@/lib/telegram";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: React.ReactNode;
}

export function PageHeader({ title, subtitle, back = true, right }: PageHeaderProps) {
  const router = useRouter();
  return (
    <header className="sticky top-0 z-30 -mx-4 mb-4 flex items-center gap-3 border-b border-white/[0.04] bg-graphite-950/70 px-4 py-3 backdrop-blur-2xl">
      {back && (
        <button
          aria-label="Back"
          onClick={() => {
            haptic("light");
            router.back();
          }}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {right}
    </header>
  );
}
