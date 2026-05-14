"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ApiError } from "@/lib/api";
import { useUserStore } from "@/stores/user-store";
import { useTranslations } from "@/hooks/use-translations";

/**
 * Fetch-and-cache hook for a single resource. The whole app uses the same
 * shape — loading flag, optional error, refresh function — so the page
 * code stays focused on rendering.
 *
 * Two safety guards:
 *   - `requiresAuth: true` defers the fetch until `useUserStore.hydrate()`
 *     has completed (a JWT is available). Prevents the silent-401 race
 *     between sibling effects (page useEffect vs auth handshake).
 *   - Cancellation: stale responses arriving after a re-mount or fast
 *     navigation are dropped via a per-call epoch counter.
 *
 * Errors fall through to a localized toast plus `state.error`. Pass
 * `silent: true` to suppress the toast (useful when the page already
 * renders an error surface).
 */
export interface ResourceState<T> {
  data: T | null;
  loading: boolean;
  error: ApiError | null;
  refresh: () => Promise<void>;
}

export function useResource<T>(
  fetcher: () => Promise<T>,
  opts: { requiresAuth?: boolean; silent?: boolean; deps?: React.DependencyList } = {},
): ResourceState<T> {
  const { requiresAuth = true, silent = false, deps = [] } = opts;
  const t = useTranslations();
  const user = useUserStore((s) => s.user);

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiError | null>(null);

  // Stable identifier we can use as a cancellation token.
  const [epoch, setEpoch] = useState(0);

  const refresh = useCallback(async () => {
    const myEpoch = epoch + 1;
    setEpoch(myEpoch);
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      // Drop stale responses if another refresh has started since.
      setEpoch((current) => {
        if (current !== myEpoch) return current;
        setData(result);
        return current;
      });
    } catch (err) {
      const apiErr =
        err instanceof ApiError
          ? err
          : new ApiError(0, "UNKNOWN", (err as Error).message);
      setError(apiErr);
      if (!silent) {
        toast.error(apiErr.message || t.errors.loadFailed);
      }
    } finally {
      setLoading(false);
    }
    // We intentionally exclude `fetcher` and `epoch` from deps — fetcher is
    // recreated on every page render and `epoch` is internal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [silent, t.errors.loadFailed]);

  useEffect(() => {
    if (requiresAuth && !user) return;
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, requiresAuth, ...deps]);

  return { data, loading, error, refresh };
}
