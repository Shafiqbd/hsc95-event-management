import type { Metadata } from "next";
import { ToastProvider } from "@/components/ui/toast";
import { AdminShell } from "@/features/admin/admin-shell";

export const metadata: Metadata = { robots: { index: false } };

export default function AdminLayout({ children }: LayoutProps<"/backend">) {
  return (
    <ToastProvider>
      <AdminShell>{children}</AdminShell>
    </ToastProvider>
  );
}
