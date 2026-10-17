import type { Metadata } from "next";
import { AdminShell } from "@/features/admin/admin-shell";

export const metadata: Metadata = { robots: { index: false } };

export default function AdminLayout({ children }: LayoutProps<"/backend">) {
  return <AdminShell>{children}</AdminShell>;
}
