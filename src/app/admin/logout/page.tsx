"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAdminStore } from "@/stores/admin-store";
import { BrandSplash } from "@/components/layout/brand-splash";

/**
 * /admin/logout — clears the HttpOnly session cookie (via the backend) and
 * the client session, then sends the operator to the login screen.
 *
 * Rendered standalone (no guard / sidebar) by the admin layout carve-out so
 * it stays reachable even with an already-expired session.
 */
export default function AdminLogoutPage() {
  const router = useRouter();
  const logout = useAdminStore((s) => s.logout);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await logout();
      if (!cancelled) router.replace("/admin/login");
    })();
    return () => {
      cancelled = true;
    };
  }, [logout, router]);

  return <BrandSplash show />;
}
