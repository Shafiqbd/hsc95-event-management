import type { Metadata } from "next";
import { NewRegistrationView } from "@/features/admin/new-registration-view";

export const metadata: Metadata = { title: "New Registration" };

export default function NewRegistrationPage() {
  return <NewRegistrationView />;
}
