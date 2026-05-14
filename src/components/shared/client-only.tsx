"use client";

import { useMounted } from "@/hooks/use-mounted";

/**
 * Defers rendering of children until after the first client render. Use it for
 * components that produce SSR/client divergent markup — sonner portals,
 * Telegram-aware widgets, anything reading window/localStorage at mount.
 *
 * Anything inside is invisible on the server and during hydration; once the
 * `useEffect` in `useMounted` flushes, the children appear with no React
 * hydration warning because the surrounding markup matched.
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const mounted = useMounted();
  return <>{mounted ? children : fallback}</>;
}
