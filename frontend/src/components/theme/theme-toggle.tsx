"use client";

import { Moon, Sun } from "lucide-react";
import { THEME_STORAGE_KEY } from "./theme-script";

export function toggleTheme(): "light" | "dark" {
  const root = document.documentElement;
  const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
  root.setAttribute("data-theme", next);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Storage unavailable (private mode); the choice lasts for this page only.
  }
  return next;
}

/**
 * Both icons are rendered and CSS picks the visible one from [data-theme],
 * so server and client markup are identical (no hydration mismatch).
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="থিম পরিবর্তন করুন (ডার্ক/লাইট)"
      title="থিম পরিবর্তন করুন"
      className={`inline-flex h-10 w-10 items-center justify-center rounded-md border border-border bg-surface text-fg transition-all duration-300 hover:scale-110 hover:border-gold/60 hover:drop-shadow-[0_0_12px_color-mix(in_oklab,var(--gold)_60%,transparent)] dark:hover:border-gold/60 ${className}`}
    >
      <Sun className="hidden h-5 w-5 text-gold dark:block" aria-hidden />
      <Moon className="h-5 w-5 text-violet dark:hidden" aria-hidden />
    </button>
  );
}
