"use client";

import { AppShell } from "@/components/layout/app-shell";
import { HomeHeader } from "@/components/home/home-header";
import { SubscriptionDashboard } from "@/components/home/subscription-dashboard";
import { HomeActions } from "@/components/home/home-actions";
import { HomeSkeleton } from "@/components/home/home-skeleton";
import { SectionHeading } from "@/components/shared/section-heading";
import { useUserStore } from "@/stores/user-store";
import { useTranslations } from "@/hooks/use-translations";

export default function HomePage() {
  const t = useTranslations();
  const { user, subscription, loading } = useUserStore();
  const initialLoading = loading && !user;
  const hasSubscription = Boolean(subscription);

  return (
    <AppShell>
      {initialLoading ? (
        <HomeSkeleton />
      ) : (
        <>
          <HomeHeader />

          <div className="mt-8">
            <SubscriptionDashboard />
          </div>

          {hasSubscription && (
            <section className="mt-8 space-y-4">
              <SectionHeading
                eyebrow={t.home.actionsEyebrow}
                title={t.home.actionsTitle}
              />
              <HomeActions />
            </section>
          )}
        </>
      )}
    </AppShell>
  );
}
