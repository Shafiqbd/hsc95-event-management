"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Route-level error boundary. Never shows error details to users. */
export default function RouteError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto flex max-w-lg flex-1 flex-col items-center px-4 py-24 text-center">
      <AlertTriangle className="h-14 w-14 text-warning" aria-hidden />
      <h1 className="mt-4 text-2xl font-bold">কিছু একটা সমস্যা হয়েছে</h1>
      <p className="mt-2 text-muted">পৃষ্ঠাটি দেখাতে সমস্যা হচ্ছে। আবার চেষ্টা করুন।</p>
      <div className="mt-8 flex gap-3">
        <Button onClick={retry} icon={<RefreshCw className="h-4 w-4" aria-hidden />}>
          আবার চেষ্টা করুন
        </Button>
        <Link href="/" className="inline-flex h-11 items-center rounded-xl border border-border px-5">
          হোম
        </Link>
      </div>
    </main>
  );
}
