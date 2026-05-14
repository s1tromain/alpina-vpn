"use client";

import { Bell, Search, Command } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslations } from "@/hooks/use-translations";

interface Props {
  title: string;
  subtitle?: string;
}

export function AdminTopbar({ title, subtitle }: Props) {
  const t = useTranslations();
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between gap-4 border-b border-white/[0.06] bg-graphite-950/70 px-4 py-4 backdrop-blur-2xl lg:px-8">
      <div>
        <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {t.admin.consoleEyebrow}
        </p>
        <h1 className="font-serif text-xl tracking-tight">{title}</h1>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="relative hidden lg:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t.admin.topbar.placeholder}
            className="h-10 w-72 pl-9 pr-12"
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded-md border border-white/10 bg-white/[0.04] px-1.5 py-0.5 text-[10px] text-muted-foreground">
            <Command className="inline h-3 w-3" /> K
          </span>
        </div>

        <button aria-label={t.common.bell} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-silver-light" />
        </button>

        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-white/10 to-transparent font-serif text-sm text-silver-light">
          A
        </div>
      </div>
    </header>
  );
}
