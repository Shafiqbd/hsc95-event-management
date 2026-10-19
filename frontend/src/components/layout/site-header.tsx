"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { BrandLink } from "@/components/brand";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { buttonClass } from "@/components/ui/button";

const NAV = [
  { href: "/", label: "হোম" },
  { href: "/#event-info", label: "ইভেন্ট তথ্য" },
  // Hidden with the সুবিধাসমূহ section on the home page:
  // { href: "/#facilities", label: "সুবিধাসমূহ" },
  { href: "/#registration", label: "নিবন্ধন" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4">
        <BrandLink />

        <nav aria-label="প্রধান নেভিগেশন" className="hidden items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="group relative rounded-md px-3 py-2 text-[15px] text-muted transition-colors hover:text-fg"
            >
              {item.label}
              <span
                aria-hidden
                className="absolute inset-x-3 -bottom-0.5 h-0.5 origin-left scale-x-0 rounded-full bg-[linear-gradient(90deg,var(--primary),var(--violet))] transition-transform duration-300 group-hover:scale-x-100"
              />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/backend/login" className={buttonClass("primary", "sm", "hidden sm:inline-flex")}>
            অ্যাডমিন লগইন
          </Link>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface md:hidden"
            aria-label={open ? "মেনু বন্ধ করুন" : "মেনু খুলুন"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" aria-label="মোবাইল নেভিগেশন" className="border-t border-border bg-bg px-4 pb-4 md:hidden">
          <ul className="flex flex-col py-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href} onClick={close} className="block rounded-md px-3 py-3 text-fg hover:bg-surface-2">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/backend/login" onClick={close} className={buttonClass("primary", "md", "w-full")}>
            অ্যাডমিন লগইন
          </Link>
        </nav>
      )}
    </header>
  );
}
