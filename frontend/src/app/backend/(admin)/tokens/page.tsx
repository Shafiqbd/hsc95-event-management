import type { Metadata } from "next";
import { TokensManager } from "@/features/admin/tokens-manager";

export const metadata: Metadata = { title: "Tokens & Printing" };

export default function TokensPage() {
  return <TokensManager />;
}
