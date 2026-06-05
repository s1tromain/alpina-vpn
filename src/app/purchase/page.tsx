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
import { PayStep } from "@/components/purchase/requisite-step";

import { api, ApiError } from "@/lib/api";
import { useResource } from "@/hooks/use-resource";
import { haptic } from "@/lib/telegram";
import { useTranslations } from "@/hooks/use-translations";
import type { Order } from "@/types";

function PurchaseInner() {
  const t = useTranslations();
  const router = useRouter();
  const params = useSearchParams();

  // Plans are public; the active payment card requires auth.
  const plansRes = useResource(() => api.plans.list(), { requiresAuth: false });
  const requisitesRes = useResource(() => api.payments.requisites());

  const plans = useMemo(() => plansRes.data ?? [], [plansRes.data]);
  const requisites = useMemo(
    () => requisitesRes.data ?? [],
    [requisitesRes.data],
  );
  const requisite = useMemo(
    () => requisites.find((r) => r.active) ?? requisites[0] ?? null,
    [requisites],
  );

  const STEPS = [
    { label: t.purchase.steps.plan },
    { label: t.purchase.steps.payment },
  ];

  const [step, setStep] = useState(0);
  const [planId, setPlanId] = useState<string>("");
  const [order, setOrder] = useState<Order | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Seed the selected plan once plans load. ?plan=<id> wins; else default to
  // the Standard tier if present, otherwise the first plan.
  useEffect(() => {
    if (planId || plans.length === 0) return;
    const requested = params.get("plan");
    const found = requested ? plans.find((p) => p.id === requested) : null;
    const fallback = plans.find((p) => p.tier === "standard") ?? plans[0];
    setPlanId(found?.id ?? fallback?.id ?? "");
  }, [planId, plans, params]);

  const plan = useMemo(
    () => plans.find((p) => p.id === planId) ?? null,
    [plans, planId],
  );

  const initialLoading =
    (plansRes.loading && plans.length === 0) ||
    (requisitesRes.loading && requisites.length === 0);

  // No active payment card => checkout cannot proceed. This is the silent
  // root cause of "purchase does nothing": `goToPayment` would return before
  // any POST. We surface it visibly and block the CTA instead.
  const noPaymentMethod = !initialLoading && !requisite;

  // Admin-facing breadcrumb in the browser console for whoever debugs it.
  useEffect(() => {
    if (noPaymentMethod) {
      console.error(
        "[purchase][admin] No active payment requisite configured — users cannot purchase. " +
          "GET /api/payments/requisites returned empty. Fix: create + activate a card in /admin/requisites " +
          "(and ensure an active Country exists), then redeploy or run `npm run db:seed`.",
      );
    }
  }, [noPaymentMethod]);

  function back() {
    haptic("light");
    setStep((s) => Math.max(s - 1, 0));
  }

  // Plan → Pay: create the order once (reuse if we already did), then advance.
  async function goToPayment() {
    console.info("[purchase] goToPayment", {
      planId,
      hasRequisite: !!requisite,
      hasOrder: !!order,
    });
    if (!planId) {
      console.warn("[purchase] goToPayment aborted: no plan selected");
      return;
    }
    if (!requisite) {
      console.error(
        "[purchase] goToPayment BLOCKED: no active payment requisite — POST /api/orders not sent. " +
          "Configure an active card in /admin/requisites (or seed the DB).",
      );
      toast.error(t.purchase.noActiveCard);
      return;
    }
    if (order) {
      setStep(1);
      return;
    }
    setCreating(true);
    haptic("medium");
    try {
      const created = await api.orders.create({ planId });
      setOrder(created);
      setStep(1);
    } catch (err) {
      // A pre-existing open order (409) carries its id — resume it.
      if (err instanceof ApiError && err.status === 409) {
        const existingId = (err.details as { orderId?: string } | undefined)
          ?.orderId;
        if (existingId) {
          try {
            const existing = await api.orders.get(existingId);
            setOrder(existing);
            setStep(1);
            return;
          } catch {
            /* fall through to generic error */
          }
        }
      }
      haptic("error");
      toast.error(err instanceof ApiError ? err.message : t.errors.createFailed);
    } finally {
      setCreating(false);
    }
  }

  // Pay step: upload the receipt → order becomes PENDING (awaiting moderation).
  async function submitReceipt() {
    if (!order) return;
    if (!file) {
      toast.error(t.purchase.receiptRequired);
      return;
    }
    setSubmitting(true);
    haptic("medium");
    try {
      await api.orders.uploadReceipt(order.id, file);
      haptic("success");
      toast.success(t.purchase.submitted, {
        description: t.purchase.submittedDesc,
      });
      router.push("/orders");
    } catch (err) {
      haptic("error");
      toast.error(err instanceof ApiError ? err.message : t.errors.createFailed);
    } finally {
      setSubmitting(false);
    }
  }

  const onPlanStep = step === 0;
  const ctaLabel = onPlanStep
    ? creating
      ? t.purchase.creatingOrder
      : t.common.continue
    : submitting
      ? t.purchase.uploading
      : t.purchase.submitReceipt;

  const ctaDisabled = onPlanStep
    ? creating || !planId || !plan || !requisite
    : submitting || !file;

  return (
    <AppShell>
      <PageHeader title={t.purchase.title} subtitle={STEPS[step].label} />

      <Stepper steps={STEPS} current={step} />

      <div className="relative mt-6 min-h-[460px]">
        {initialLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : noPaymentMethod ? (
          <div
            role="alert"
            className="rounded-3xl border border-red-400/25 bg-red-400/[0.06] p-5 text-sm leading-relaxed text-red-200"
          >
            {t.purchase.noActiveCard}
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
              {step === 1 && plan && requisite && (
                <PayStep
                  requisite={requisite}
                  amount={plan.priceUsd}
                  file={file}
                  onFileChange={setFile}
                  uploading={submitting}
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
          onClick={onPlanStep ? goToPayment : submitReceipt}
          disabled={ctaDisabled || initialLoading}
        >
          {ctaLabel}
          {onPlanStep && !creating && <ArrowRight className="h-4 w-4" />}
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
