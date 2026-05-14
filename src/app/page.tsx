"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Hero } from "@/components/home/hero";
import { VpnStatusCard } from "@/components/home/vpn-status-card";
import { CountriesRow } from "@/components/home/countries-row";
import { PlansGrid } from "@/components/home/plans-grid";
import { FeaturesSection } from "@/components/home/features-section";
import { HomeSkeleton } from "@/components/home/home-skeleton";
import { SectionHeading } from "@/components/shared/section-heading";
import { api } from "@/lib/api";
import { useResource } from "@/hooks/use-resource";
import { useUserStore } from "@/stores/user-store";
import { useTranslations, format } from "@/hooks/use-translations";

export default function HomePage() {
  const t = useTranslations();
  const { user, loading: userLoading } = useUserStore();
  // /plans + /countries are public on the Fastify backend — fetch without
  // waiting for the auth handshake.
  const plans = useResource(() => api.plans.list(), { requiresAuth: false });
  const countries = useResource(() => api.countries.list(), {
    requiresAuth: false,
  });

  const greeting = user?.firstName
    ? format(t.home.welcomeName, { name: user.firstName })
    : t.home.welcome;

  // Show the skeleton only on the *first* paint. Once data lands we keep
  // the previous arrays in place during background refresh so the page
  // doesn't flicker on subsequent visits.
  const initialLoading =
    userLoading ||
    (plans.loading && !plans.data) ||
    (countries.loading && !countries.data);

  return (
    <AppShell>
      {initialLoading ? (
        <HomeSkeleton />
      ) : (
        <>
          <Hero greeting={greeting} />

          <div className="mt-8">
            <VpnStatusCard />
          </div>

          <section className="mt-10 space-y-4">
            <SectionHeading
              eyebrow={t.home.locationsEyebrow}
              title={t.home.locationsTitle}
              action={
                <Link
                  href="/vpn"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                >
                  {t.home.locationsAll} <ArrowUpRight className="h-3 w-3" />
                </Link>
              }
            />
            <CountriesRow countries={countries.data ?? []} />
          </section>

          <section className="mt-10 space-y-4">
            <SectionHeading
              eyebrow={t.home.membershipEyebrow}
              title={t.home.membershipTitle}
              description={t.home.membershipDesc}
            />
            <PlansGrid plans={plans.data ?? []} />
          </section>

          <section className="mt-10 space-y-4">
            <SectionHeading
              eyebrow={t.home.whyEyebrow}
              title={t.home.whyTitle}
            />
            <FeaturesSection />
          </section>

          <footer className="mt-14 space-y-2 text-center">
            <div className="divider-noble mx-auto w-24" />
            <p className="font-serif text-xs italic text-muted-foreground">
              {t.home.footerTagline}
            </p>
          </footer>
        </>
      )}
    </AppShell>
  );
}
