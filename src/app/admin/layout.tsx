import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminBootstrap } from "@/components/admin/admin-bootstrap";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh w-full">
      <AdminBootstrap />
      <AdminSidebar />
      <main className="flex min-h-dvh w-full flex-col">{children}</main>
    </div>
  );
}
