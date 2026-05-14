"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Stepper } from "@/components/purchase/stepper";
import { PlanStep } from "@/components/purchase/plan-step";
import { CountryStep } from "@/components/purchase/country-step";
import { RequisiteStep } from "@/components/purchase/requisite-step";
import { ConfirmStep } from "@/components/purchase/confirm-step";

import { api, ApiError } from "@/lib/api";
import { useResource } from "@/hooks/use-resource";
import { haptic } from "@/lib/telegram";
import { useTranslations } from "@/hooks/use-translations";

function PurchaseInner() {
  const t = useTranslations();
  const router = useRouter();
  const params = useSearchParams();

  // Plans + countries are public; requisites require auth.
  const plansRes = useResource(() => api.plans.list(), { requiresAuth: false });
  const countriesRes = useResource(() => api.countries.list(), {
    requiresAuth: false,
  });
  const requisitesRes = useResource(() => api.payments.requisites());

  // Memoize so the `[]` fallback doesn't produce a fresh reference each
  // render — would otherwise trip the exhaustive-deps check on the
  // selection effects + memos below.
  const plans = useMemo(() => plansRes.data ?? [], [plansRes.data]);
  const countries = useMemo(
    () => countriesRes.data ?? [],
    [countriesRes.data],
  );
  const requisites = useMemo(
    () => requisitesRes.data ?? [],
    [requisitesRes.data],
  );

  const STEPS = [
    { label: t.purchase.steps.plan },
    { label: t.purchase.steps.country },
    { label: t.purchase.steps.payment },
    { label: t.purchase.steps.confirm },
  ];

  const [step, setStep] = useState(0);
  const [planId, setPlanId] = useState<string>("");
  const [countryCode, setCountryCode] = useState<string>("");
  const [requisiteId, setRequisiteId] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);

  // Seed the wizard once the catalogues have loaded. The ?plan=<id> query
  // param wins if present; otherwise we pick a sensible default (3-month
  // plan if available, else first plan).
  useEffect(() => {
    if (planId || plans.length === 0) return;
    const requested = params.get("plan");
    const found = requested ? plans.find((p) => p.id === requested) : null;
    const fallback = plans.find((p) => p.duration === "3m") ?? plans[0];
    setPlanId(found?.id ?? fallback?.id ?? "");
  }, [planId, plans, params]);

  useEffect(() => {
    if (countryCode || countries.length === 0) return;
    const preferred = countries.find((c) => !c.premium) ?? countries[0];
    setCountryCode(preferred?.code ?? "");
  }, [countryCode, countries]);

  useEffect(() => {
    if (requisiteId || requisites.length === 0) return;
    const active = requisites.find((r) => r.active) ?? requisites[0];
    setRequisiteId(active?.id ?? "");
  }, [requisiteId, requisites]);

  const plan = useMemo(
    () => plans.find((p) => p.id === planId) ?? null,
    [plans, planId],
  );
  const country = useMemo(
    () => countries.find((c) => c.code === countryCode) ?? null,
    [countries, countryCode],
  );
  const requisite = useMemo(
    () => requisites.find((r) => r.id === requisiteId) ?? null,
    [requisites, requisiteId],
  );

  const catalogueReady =
    !!plan && !!country && !!requisite && plans.length > 0 &&
    countries.length > 0 && requisites.length > 0;

  function next() {
    haptic("light");
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }
  function back() {
    haptic("light");
    setStep((s) => Math.max(s - 1, 0));
  }

  async function submit() {
    if (!planId || !countryCode || !requisiteId) return;
    setSubmitting(true);
    haptic("medium");
    try {
      const order = await api.orders.create({
        planId,
        countryCode,
        requisiteId,
      });
      // Tell the backend the user has marked it paid. The frontend's flow
      // assumes "Submit" = "I have paid" — keep that contract.
      try {
        await api.orders.markPaid(order.id);
      } catch {
        // If markPaid fails, the order still exists as `pending`. The user
        // will be able to retry from the orders page.
      }
      haptic("success");
      toast.success(t.purchase.orderCreated, {
        description: t.purchase.orderCreatedDesc,
      });
      router.push("/orders");
    } catch (err) {
      haptic("error");
      toast.error(
        err instanceof ApiError ? err.message : t.errors.createFailed,
      );
    } finally {
      setSubmitting(false);
    }
  }

  const ctaLabel =
    step === STEPS.length - 1
      ? submitting
        ? t.purchase.submitting
        : t.purchase.iPaid
      : t.common.continue;

  const initialLoading =
    (plansRes.loading && plans.length === 0) ||
    (countriesRes.loading && countries.length === 0) ||
    (requisitesRes.loading && requisites.length === 0);

  return (
    <AppShell>
      <PageHeader title={t.purchase.title} subtitle={STEPS[step].label} />

      <Stepper steps={STEPS} current={step} />

      <div className="relative mt-6 min-h-[460px]">
        {initialLoading || !catalogueReady ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 0 && (
                <PlanStep plans={plans} value={planId} onChange={setPlanId} />
              )}
              {step === 1 && (
                <CountryStep
                  countries={countries}
                  value={countryCode}
                  onChange={setCountryCode}
                />
              )}
              {step === 2 && plan && (
                <RequisiteStep
                  requisites={requisites}
                  value={requisiteId}
                  onChange={setRequisiteId}
                  amount={plan.priceUsd}
                />
              )}
              {step === 3 && plan && country && requisite && (
                <ConfirmStep
                  plan={plan}
                  country={country}
                  requisite={requisite}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>

      <div className="sticky bottom-24 z-10 mt-6 flex items-center gap-2">
        {step > 0 && (
          <Button
            variant="secondary"
            size="lg"
            onClick={back}
            className="px-4"
            disabled={submitting}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <Button
          size="lg"
          className="flex-1"
          onClick={step === STEPS.length - 1 ? submit : next}
          disabled={submitting || !catalogueReady}
        >
          {ctaLabel}
          {step !== STEPS.length - 1 && <ArrowRight className="h-4 w-4" />}
        </Button>
      </div>
    </AppShell>
  );
}

export default function PurchasePage() {
  return (
    <Suspense fallback={null}>
      <PurchaseInner />
    </Suspense>
  );
}
