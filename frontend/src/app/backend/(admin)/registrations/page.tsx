import type { Metadata } from "next";
import { RegistrationsView } from "@/features/admin/registrations-view";

export const metadata: Metadata = { title: "Registrations" };

export default function RegistrationsPage() {
  return <RegistrationsView />;
}
