"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Power, Shield, Activity } from "lucide-react";
import { GlassCard } from "@/components/shared/glass-card";
import { Button } from "@/components/ui/button";
import { useVpnStore } from "@/stores/vpn-store";
import { useUserStore } from "@/stores/user-store";
import { haptic } from "@/lib/telegram";
import { cn } from "@/lib/utils";
import { useTranslations } from "@/hooks/use-translations";
import { useMounted } from "@/hooks/use-mounted";

function formatUptime(ms: number) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600)
    .toString()
    .padStart(2, "0");
  const m = Math.floor((totalSec % 3600) / 60)
    .toString()
    .padStart(2, "0");
  const s = (totalSec % 60).toString().padStart(2, "0");
  return `${h}:${m}:${s}`;
}

export function VpnStatusCard() {
  const t = useTranslations();
  const mounted = useMounted();
  const { connection, connect, disconnect, connectedSince } = useVpnStore();
  const subscription = useUserStore((s) => s.subscription);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (connection !== "connected") return;
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, [connection]);

  const active = connection === "connected";
  const connecting = connection === "connecting";

  const country = subscription?.country;
  // `Date.now()` differs between the server render and the first client render.
  // Until `mounted` flips, render a stable placeholder so the markup matches.
  const uptime =
    mounted && connectedSince != null
      ? formatUptime(Date.now() - connectedSince)
      : "00:00:00";

  return (
    <GlassCard accent="premium" className="p-6">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            <Shield className="h-3 w-3" />
            {t.vpnStatus.eyebrow}
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "relative inline-flex h-2 w-2 rounded-full",
                active
                  ? "bg-emerald-400"
                  : connecting
                    ? "bg-amber-400"
                    : "bg-muted-foreground/50",
              )}
            >
              {active && (
                <span className="absolute inset-0 animate-pulse-ring rounded-full bg-emerald-400/40" />
              )}
            </span>
            <span className="text-sm font-medium">
              {active
                ? t.vpnStatus.protected
                : connecting
                  ? t.vpnStatus.establishing
                  : t.vpnStatus.idle}
            </span>
          </div>
        </div>

        {country && (
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
            <span className="text-lg leading-none">{country.flag}</span>
            <div className="leading-tight">
              <p className="text-xs font-medium">{country.code}</p>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                {country.ping} ms
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-center justify-center">
        <motion.button
          onClick={() => {
            haptic(active ? "warning" : "success");
            active ? disconnect() : connect();
          }}
          whileTap={{ scale: 0.94 }}
          className={cn(
            "relative flex h-32 w-32 items-center justify-center rounded-full border transition-all",
            active
              ? "border-emerald-400/30 bg-gradient-to-br from-emerald-400/15 to-emerald-400/0"
              : "border-white/10 bg-gradient-to-br from-white/[0.08] to-transparent",
          )}
        >
          {active && (
            <>
              <span className="absolute inset-0 animate-pulse-ring rounded-full border border-emerald-400/30" />
              <span
                className="absolute inset-0 animate-pulse-ring rounded-full border border-emerald-400/20"
                style={{ animationDelay: "0.6s" }}
              />
            </>
          )}
          <div
            className={cn(
              "flex h-24 w-24 items-center justify-center rounded-full border bg-graphite-900/80 backdrop-blur-xl",
              active ? "border-emerald-400/30" : "border-white/10",
            )}
          >
            <Power
              className={cn(
                "h-9 w-9 transition-colors",
                active ? "text-emerald-300" : "text-silver-light",
              )}
            />
          </div>
        </motion.button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={active ? "on" : "off"}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.25 }}
          className="mt-6 grid grid-cols-3 gap-3 text-center"
        >
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-3">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
              {t.vpnStatus.uptime}
            </p>
            <p className="mt-1 font-mono text-sm">{uptime}</p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-3">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
              {t.vpnStatus.protocol}
            </p>
            <p className="mt-1 text-sm font-medium">Reality</p>
          </div>
          <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-3 py-3">
            <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
              {t.vpnStatus.ipShield}
            </p>
            <p className="mt-1 inline-flex items-center justify-center gap-1 text-sm font-medium">
              <Activity className="h-3 w-3" />
              {active ? t.status.on : t.status.off}
              <span className="hidden">{tick}</span>
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {!subscription && (
        <div className="mt-6">
          <Button asChild size="lg" className="w-full">
            <a href="/purchase">{t.vpnStatus.activate}</a>
          </Button>
        </div>
      )}
    </GlassCard>
  );
}
