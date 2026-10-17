"use client";

import {
  ClipboardList,
  FlaskConical,
  LayoutDashboard,
  LogOut,
  Menu,
  Printer,
  RotateCcw,
  ShieldAlert,
  UserPlus,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useContext, useState, type ReactNode } from "react";
import { BrandLink } from "@/components/brand";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Skeleton } from "@/components/ui/feedback";
import { HOME_FOR_ROLE } from "@/features/auth/login-form";
import { LOGIN_PATH, useSession } from "@/hooks/use-session";
import { errorMessage, isMockMode } from "@/lib/api";
import { resetMockData } from "@/lib/mock-api";
import type { Role, SessionUser } from "@/types/api";

export const ROLE_LABEL: Record<Role, string> = { admin: "Admin", register: "Register", viewer: "Report Viewer" };

/** Register users only ever see the forms they entered themselves. */
export const isOwnScope = (user: SessionUser) => user.role === "register";

const NAV: { href: string; label: string; ownLabel?: string; icon: LucideIcon; roles: Role[] }[] = [
  { href: "/backend/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "register", "viewer"] },
  { href: "/backend/registrations/new", label: "New Registration", icon: UserPlus, roles: ["admin", "register"] },
  { href: "/backend/registrations", label: "Registrations", ownLabel: "My Registrations", icon: ClipboardList, roles: ["admin", "register", "viewer"] },
  { href: "/backend/tokens", label: "Tokens & Printing", icon: Printer, roles: ["admin", "register", "viewer"] },
  { href: "/backend/users", label: "Users", icon: Users, roles: ["admin"] },
];

const StaffContext = createContext<SessionUser | null>(null);

/** The signed-in staff user (only inside AdminShell). */
export function useStaff(): SessionUser {
  const user = useContext(StaffContext);
  if (!user) throw new Error("useStaff must be used inside AdminShell");
  return user;
}

/** Page-level role check (UX only; the API enforces the same rule). */
export function RoleGate({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const user = useStaff();
  if (roles.includes(user.role)) return <>{children}</>;
  return (
    <div className="mx-auto max-w-lg">
      <Alert tone="danger" title="Access denied">
        <span className="inline-flex flex-wrap items-center gap-2">
          <ShieldAlert className="h-4 w-4" aria-hidden /> Your role ({ROLE_LABEL[user.role]}) cannot open this page.
          <Link className="text-primary underline" href={HOME_FOR_ROLE[user.role]}>
            Go back
          </Link>
        </span>
      </Alert>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { state, logout } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);

  const role = state.status === "ready" ? state.user.role : null;
  const items = role ? NAV.filter((item) => item.roles.includes(role)) : [];
  // The longest matching href wins, so "/registrations/new" is not also "/registrations".
  const activeHref = items
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  const nav = (
    <nav aria-label="Staff navigation" className="flex flex-col gap-1 p-3">
      {items.map(({ href, label, ownLabel, icon: Icon }) => {
        const active = href === activeHref;
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMenuOpen(false)}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 hover:brightness-110 ${
              active
                ? "bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_22%,transparent),color-mix(in_oklab,var(--violet)_18%,transparent))] text-primary"
                : "text-muted hover:bg-surface-2 hover:text-fg"
            }`}
          >
            <Icon className="h-5 w-5" aria-hidden /> {role === "register" && ownLabel ? ownLabel : label}
          </Link>
        );
      })}
      {isMockMode && (
        <div className="mt-4 rounded-xl border border-dashed border-gold/50 bg-gold/5 p-3 text-xs">
          <p className="flex items-center gap-1.5 font-semibold text-gold">
            <FlaskConical className="h-4 w-4" aria-hidden /> Demo mode
          </p>
          <p className="mt-1 text-muted">Static data stored in this browser. Not connected to the database.</p>
          <button
            type="button"
            className="mt-2 inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            onClick={() => {
              if (window.confirm("Reset all demo data and sign out?")) {
                resetMockData();
                router.replace(LOGIN_PATH);
              }
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Reset demo data
          </button>
        </div>
      )}
    </nav>
  );

  return (
    <div className="flex min-h-full flex-1">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-bg-soft lg:flex">
        <div className="flex h-16 items-center border-b border-border px-4">
          <BrandLink href="/backend/dashboard" />
        </div>
        {nav}
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Staff navigation">
          <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <aside className="relative h-full w-72 border-r border-border bg-bg-soft">
            <div className="flex h-16 items-center justify-between border-b border-border px-4">
              <BrandLink href="/backend/dashboard" />
              <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} className="rounded-lg p-2 hover:bg-surface-2">
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border bg-bg/85 px-4 backdrop-blur">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-surface lg:hidden"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <Menu className="h-5 w-5" aria-hidden />
          </button>
          <p className="hidden text-sm text-muted sm:block">HSC 95 Society — 30 Years Celebration</p>
          <div className="ml-auto flex items-center gap-2">
            {state.status === "ready" && (
              <span className="hidden items-center gap-2 text-sm font-medium md:inline-flex">
                {state.user.fullName} <Badge tone="info">{ROLE_LABEL[state.user.role]}</Badge>
              </span>
            )}
            <ThemeToggle />
            <Button variant="secondary" size="sm" onClick={logout} icon={<LogOut className="h-4 w-4" aria-hidden />}>
              Logout
            </Button>
          </div>
        </header>

        <main id="main" className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {state.status === "loading" && (
            <div className="space-y-4" aria-label="Loading">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-64 w-full" />
            </div>
          )}
          {state.status === "error" && <Alert tone="danger" title="Could not load your session">{errorMessage(state.error)}</Alert>}
          {state.status === "ready" && <StaffContext.Provider value={state.user}>{children}</StaffContext.Provider>}
        </main>
      </div>
    </div>
  );
}
