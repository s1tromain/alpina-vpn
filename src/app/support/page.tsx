"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  MessageCircle,
  Send,
  AlertTriangle,
  Wifi,
  Cpu,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { GlassCard } from "@/components/shared/glass-card";
import { SectionHeading } from "@/components/shared/section-heading";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { openTelegram } from "@/lib/telegram";
import { useTranslations } from "@/hooks/use-translations";

const issueIcons = [Wifi, AlertTriangle, Cpu];

export default function SupportPage() {
  const t = useTranslations();
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <AppShell>
      <PageHeader
        title={t.support.title}
        subtitle={t.support.subtitle}
        back={false}
      />

      {/* Hero contact card */}
      <GlassCard accent="premium" className="p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-silver-light">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="font-serif text-base">{t.support.contactTitle}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {t.support.contactDesc}
            </p>
          </div>
        </div>
        <Button
          className="mt-4 w-full"
          onClick={() => openTelegram("https://t.me/alpinavpn_support")}
        >
          <Send className="h-4 w-4" />
          {t.support.contactCta}
        </Button>
      </GlassCard>

      {/* Common problems */}
      <section className="mt-8 space-y-3">
        <SectionHeading
          eyebrow={t.support.diagnosticsEyebrow}
          title={t.support.diagnosticsTitle}
        />
        <div className="space-y-2">
          {t.support.issues.map((it, idx) => {
            const Icon = issueIcons[idx] ?? Wifi;
            return (
              <GlassCard key={it.title} className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-silver-light">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{it.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                      {it.desc}
                    </p>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </section>

      {/* FAQ */}
      <section className="mt-8 space-y-3">
        <SectionHeading
          eyebrow={t.support.knowledgeEyebrow}
          title={t.support.knowledgeTitle}
        />
        <ul className="space-y-2">
          {t.support.faq.map((q, idx) => {
            const open = openIdx === idx;
            return (
              <li
                key={idx}
                className="overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.02]"
              >
                <button
                  onClick={() => setOpenIdx(open ? null : idx)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
                >
                  <span className="text-sm font-medium">{q.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      open && "rotate-180",
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                      <p className="px-4 pb-4 pt-0 text-xs leading-relaxed text-muted-foreground">
                        {q.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </li>
            );
          })}
        </ul>
      </section>

      <footer className="mt-12 text-center">
        <p className="font-serif text-xs italic text-muted-foreground">
          {t.support.footerTagline}
        </p>
      </footer>
    </AppShell>
  );
}
