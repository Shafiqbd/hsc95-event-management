import { SearchX } from "lucide-react";
import { PublicShell } from "@/components/layout/public-shell";
import { LinkButton } from "@/components/ui/button";

export default function NotFound() {
  return (
    <PublicShell>
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-24 text-center">
        <SearchX className="h-14 w-14 text-muted" aria-hidden />
        <h1 className="mt-4 text-3xl font-bold">পৃষ্ঠাটি পাওয়া যায়নি</h1>
        <p className="mt-2 text-muted">আপনি যে পৃষ্ঠাটি খুঁজছেন সেটি নেই বা সরানো হয়েছে।</p>
        <LinkButton href="/" className="mt-8">
          হোমে ফিরে যান
        </LinkButton>
      </div>
    </PublicShell>
  );
}
