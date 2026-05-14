"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { haptic } from "@/lib/telegram";
import { useTranslations } from "@/hooks/use-translations";

export function useCopy() {
  const t = useTranslations();
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string, label?: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        haptic("success");
        toast.success(label ?? t.toasts.copied);
        setTimeout(() => setCopied(false), 1500);
      } catch {
        haptic("error");
        toast.error(t.toasts.copyFailed);
      }
    },
    [t],
  );

  return { copy, copied };
}
