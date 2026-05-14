"use client";

import { useEffect } from "react";
import { useUserStore } from "@/stores/user-store";

/**
 * Run an effect ONLY once the user-store has finished its cold-start
 * handshake AND a user is present. Use this instead of a plain
 * `useEffect` when the effect performs an authenticated fetch — it
 * prevents the classic race where the page's `useEffect` fires before
 * `useUserStore.hydrate()` has written the JWT, returning a 401 that
 * gets silently swallowed under the BrandSplash.
 *
 * Pass an effect AND the dependency list, same as `useEffect`. The hook
 * automatically appends the user identity to the deps so the effect
 * re-runs once login completes.
 *
 * Usage:
 *
 *   useAuthedEffect(() => {
 *     void refresh();
 *   }, [refresh]);
 */
export function useAuthedEffect(
  effect: React.EffectCallback,
  deps: React.DependencyList,
) {
  const user = useUserStore((s) => s.user);
  useEffect(() => {
    if (!user) return;
    return effect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, ...deps]);
}
