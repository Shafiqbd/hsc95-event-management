import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Emblem } from "@/components/brand";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { LoginForm } from "@/features/auth/login-form";

export const metadata: Metadata = { title: "Staff Login", robots: { index: false } };

export default function AdminLoginPage() {
  return (
    <main className="relative flex min-h-full flex-1 items-center justify-center px-4 py-16">
      <ThemeToggle className="absolute right-4 top-4" />
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 shadow-soft">
        <div className="mb-6 flex items-center gap-3">
          <Emblem size={52} />
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold">
              <ShieldCheck className="h-6 w-6 text-violet" aria-hidden /> স্টাফ লগইন
            </h1>
            <p className="text-sm text-muted">Admin · Register · Report Viewer</p>
          </div>
        </div>
        <LoginForm />
        <p className="mt-6 text-center text-sm">
          <Link href="/" className="text-muted hover:text-fg">
            ← ওয়েবসাইটে ফিরে যান
          </Link>
        </p>
      </div>
    </main>
  );
}
