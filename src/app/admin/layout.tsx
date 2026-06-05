"use client";

import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminGuard } from "@/components/admin/admin-guard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // The login + logout screens are intentionally outside the guard + chrome:
  // they must be reachable without (or while tearing down) a session and
  // render standalone (no sidebar).
  if (pathname === "/admin/login" || pathname === "/admin/logout") {
    return <>{children}</>;
  }

  return (
    <AdminGuard>
      <div className="flex min-h-dvh w-full">
        <AdminSidebar />
        <main className="flex min-h-dvh w-full flex-col">{children}</main>
      </div>
    </AdminGuard>
  );
}
