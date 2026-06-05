"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminStore } from "@/stores/admin-store";
import { setUnauthorizedHandler } from "@/lib/api";
import { BrandSplash } from "@/components/layout/brand-splash";

/**
 * Gate for the web admin panel. Runs the cookie-based session handshake
 * (`GET /auth/admin/me`) on mount and:
 *
 *   - shows the brand splash while the session is being resolved,
 *   - redirects to /admin/login when there is no valid session,
 *   - renders the panel once an admin/operator session is confirmed.
 *
 * It also overrides the global 401 handler (normally a Telegram re-auth used
 * by the Mini App) so that a session expiring mid-use sends the operator back
 * to the login screen instead of looping on the unavailable Telegram bridge.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const admin = useAdminStore((s) => s.admin);
  const loading = useAdminStore((s) => s.loading);
  const hydrate = useAdminStore((s) => s.hydrate);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      useAdminStore.setState({ admin: null, loading: false });
      router.replace("/admin/login");
    });
    void hydrate();
    return () => setUnauthorizedHandler(null);
  }, [hydrate, router]);

  useEffect(() => {
    if (!loading && !admin) {
      router.replace("/admin/login");
    }
  }, [loading, admin, router]);

  if (loading || !admin) {
    return <BrandSplash show />;
  }

  return <>{children}</>;
}
