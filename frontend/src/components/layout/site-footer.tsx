import Link from "next/link";
import { EVENT } from "@/config/event";
import { toBnDigits } from "@/lib/format";

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-border bg-bg-soft">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <p className="font-bold">{EVENT.societyName}</p>
          <p className="text-sm text-muted">{EVENT.celebration}</p>
          <p className="mt-2 text-sm text-muted">
            {EVENT.dateBn} · {EVENT.venue}
          </p>
        </div>
        <nav aria-label="ফুটার লিংক" className="text-sm">
          <p className="mb-2 font-semibold">দরকারি লিংক</p>
          <ul className="space-y-1.5 text-muted">
            <li><Link className="hover:text-fg" href="/#event-info">ইভেন্ট তথ্য</Link></li>
            <li><Link className="hover:text-fg" href="/#registration">নিবন্ধনের নিয়ম</Link></li>
            <li><Link className="hover:text-fg" href="/backend/login">অ্যাডমিন লগইন</Link></li>
          </ul>
        </nav>
        <div className="text-sm text-muted sm:text-right">
          <p>© {toBnDigits(EVENT.dateIso.slice(0, 4))} {EVENT.societyName}</p>
          <p>সর্বস্বত্ব সংরক্ষিত।</p>
        </div>
      </div>
    </footer>
  );
}
