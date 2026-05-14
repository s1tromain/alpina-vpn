"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Home, User, ShoppingBag, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/telegram";
import { useTranslations } from "@/hooks/use-translations";

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations();
  if (pathname?.startsWith("/admin")) return null;

  const items = [
    { href: "/", label: t.nav.home, icon: Home, exact: true },
    { href: "/vpn", label: t.nav.vpn, icon: Shield },
    { href: "/orders", label: t.nav.orders, icon: ShoppingBag },
    { href: "/profile", label: t.nav.profile, icon: User },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 pb-safe">
      <div className="mx-auto max-w-md px-4 pb-3">
        <div className="relative flex items-center justify-between rounded-full border border-white/[0.08] bg-graphite-900/80 px-2 py-2 backdrop-blur-2xl shadow-glass-lg">
          {items.map(({ href, label, icon: Icon, exact }) => {
            const active = exact
              ? pathname === href
              : pathname === href || pathname?.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => haptic("selection")}
                className="relative flex flex-1 flex-col items-center gap-0.5 rounded-full px-2 py-2"
              >
                {active && (
                  <motion.span
                    layoutId="nav-active"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    className="absolute inset-0 rounded-full bg-gradient-to-b from-white/[0.09] to-white/[0.02] ring-1 ring-white/10"
                  />
                )}
                <Icon
                  className={cn(
                    "relative z-10 h-[19px] w-[19px] transition-colors",
                    active ? "text-foreground" : "text-muted-foreground",
                  )}
                />
                <span
                  className={cn(
                    "relative z-10 text-[10px] font-medium tracking-wide transition-colors",
                    active ? "text-foreground" : "text-muted-foreground/80",
                  )}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
