"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { haptic } from "@/lib/telegram";
import { useTranslations, format } from "@/hooks/use-translations";
import type { VPNServer } from "@/types";

interface Props {
  servers: VPNServer[];
  value: string | null;
  onChange: (id: string) => void;
}

export function ServerList({ servers, value, onChange }: Props) {
  const t = useTranslations();
  return (
    <ul className="space-y-2">
      {servers.map((s, idx) => {
        const active = value === s.id;
        const offline = s.status !== "online";
        const countryName =
          (t.countries as Record<string, string>)[s.countryCode] ?? s.country;
        const cityName = (t.cities as Record<string, string>)[s.city] ?? s.city;
        return (
          <motion.li
            key={s.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03, duration: 0.35 }}
          >
            <button
              disabled={offline}
              onClick={() => {
                haptic("selection");
                onChange(s.id);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border p-3.5 text-left transition-all",
                offline
                  ? "border-white/[0.04] bg-white/[0.01] opacity-50"
                  : active
                    ? "border-white/20 bg-white/[0.06]"
                    : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]",
              )}
            >
              <div className="text-2xl leading-none">{s.flag}</div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium">
                    {cityName}, {countryName}
                  </p>
                  {s.premium && (
                    <span className="text-[8.5px] font-medium uppercase tracking-wider text-silver">
                      {t.countries.premier}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {s.protocol} ·{" "}
                  {offline ? (
                    <span className="text-red-300">
                      {s.status === "offline"
                        ? t.status.offline
                        : t.status.maintenance}
                    </span>
                  ) : (
                    <>
                      <span className="text-foreground/80">
                        {format(t.common.pingMs, { n: s.ping })}
                      </span>{" "}
                      · <LoadBar load={s.load} />
                    </>
                  )}
                </p>
              </div>

              <span
                className={cn(
                  "relative inline-flex h-2 w-2 rounded-full",
                  s.status === "online"
                    ? "bg-emerald-400"
                    : s.status === "maintenance"
                      ? "bg-amber-400"
                      : "bg-red-400",
                )}
              >
                {s.status === "online" && (
                  <span className="absolute inset-0 animate-pulse-ring rounded-full bg-emerald-400/40" />
                )}
              </span>
            </button>
          </motion.li>
        );
      })}
    </ul>
  );
}

function LoadBar({ load }: { load: number }) {
  const color =
    load < 30
      ? "bg-emerald-400"
      : load < 70
        ? "bg-amber-400"
        : "bg-red-400";
  return (
    <span className="inline-flex items-center gap-1 align-middle">
      <span className="inline-block h-1 w-10 overflow-hidden rounded-full bg-white/[0.06]">
        <span
          className={cn("inline-block h-full rounded-full", color)}
          style={{ width: `${load}%` }}
        />
      </span>
      <span className="text-muted-foreground">{load}%</span>
    </span>
  );
}
