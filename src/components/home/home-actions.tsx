"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, Download, QrCode, Smartphone } from "lucide-react";
import { useUserStore } from "@/stores/user-store";
import { useTranslations } from "@/hooks/use-translations";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/utils";

interface ActionItem {
  icon: typeof Download;
  title: string;
  subtitle: string;
  onSelect: () => void;
}

export function HomeActions() {
  const t = useTranslations();
  const subscription = useUserStore((s) => s.subscription);
  if (!subscription) return null;

  const downloadConfig = () => {
    haptic("light");
    if (typeof window === "undefined") return;
    const blob = new Blob([subscription.subscriptionUrl], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "alpina-vpn.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const items: ActionItem[] = [
    {
      icon: Download,
      title: t.actions.config.title,
      subtitle: t.actions.config.subtitle,
      onSelect: downloadConfig,
    },
    {
      icon: QrCode,
      title: t.actions.qr.title,
      subtitle: t.actions.qr.subtitle,
      onSelect: () => haptic("selection"),
    },
    {
      icon: BookOpen,
      title: t.actions.guide.title,
      subtitle: t.actions.guide.subtitle,
      onSelect: () => haptic("selection"),
    },
    {
      icon: Smartphone,
      title: t.actions.devices.title,
      subtitle: t.actions.devices.subtitle,
      onSelect: () => haptic("selection"),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5">
      {items.map((item, idx) => (
        <ActionTile key={item.title} item={item} index={idx} />
      ))}
    </div>
  );
}

function ActionTile({ item, index }: { item: ActionItem; index: number }) {
  const Icon = item.icon;
  const content = (
    <>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
      />
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-transparent text-silver-light transition-colors group-hover:from-white/[0.1]">
        <Icon className="h-4 w-4" />
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium leading-tight text-foreground">
          {item.title}
        </p>
        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
          {item.subtitle}
        </p>
      </div>
    </>
  );

  const baseClass = cn(
    "group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4 text-left",
    "backdrop-blur-xl shadow-[0_8px_24px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.05)]",
    "transition-all duration-300 hover:border-white/15 hover:bg-white/[0.045]",
  );

  // The "download config" tile is a real button (triggers a file download).
  // The remaining tiles are navigation — link to /vpn so the user lands on
  // the page that owns QR, setup steps and device management.
  if (item.icon === Download) {
    return (
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        whileTap={{ scale: 0.97 }}
        onClick={item.onSelect}
        className={baseClass}
      >
        {content}
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileTap={{ scale: 0.97 }}
    >
      <Link href="/vpn" onClick={item.onSelect} className={baseClass}>
        {content}
      </Link>
    </motion.div>
  );
}
