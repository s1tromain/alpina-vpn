"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Receipt,
  Wallet,
  Server,
  Package,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandWordmark } from "@/components/layout/brand";
import { useTranslations } from "@/hooks/use-translations";

export function AdminSidebar() {
  const t = useTranslations();
  const pathname = usePathname();

  const items = [
    {
      href: "/admin",
      label: t.admin.sidebar.dashboard,
      icon: LayoutDashboard,
      exact: true,
    },
    { href: "/admin/users", label: t.admin.sidebar.users, icon: Users },
    { href: "/admin/orders", label: t.admin.sidebar.orders, icon: Receipt },
    { href: "/admin/plans", label: t.admin.sidebar.plans, icon: Package },
    { href: "/admin/servers", label: t.admin.sidebar.servers, icon: Server },
    {
      href: "/admin/requisites",
      label: t.admin.sidebar.requisites,
      icon: Wallet,
    },
  ];

  return (
    <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-6 border-r border-white/[0.06] bg-graphite-950/60 p-6 backdrop-blur-2xl lg:flex">
      <BrandWordmark />

      <div className="divider-noble" />

      <nav className="flex-1 space-y-1">
        <p className="px-3 pb-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          {t.admin.sidebar.consoleLabel}
        </p>
        {items.map(({ href, label, icon: Icon, exact }) => {
          const active = exact ? pathname === href : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
                active
                  ? "bg-gradient-to-r from-white/[0.08] to-transparent text-foreground ring-1 ring-white/10"
                  : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-1">
        <Link
          href="/admin/settings"
          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
        >
          <Settings className="h-4 w-4" />
          {t.admin.sidebar.settings}
        </Link>
        <Link
          href="/admin/logout"
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
        >
          <LogOut className="h-4 w-4" />
          {t.admin.sidebar.exit}
        </Link>
      </div>
    </aside>
  );
}
