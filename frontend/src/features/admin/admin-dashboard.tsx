"use client";

import {
  BadgeDollarSign,
  CalendarPlus,
  Camera,
  Car,
  ClipboardList,
  KeyRound,
  Printer,
  RefreshCw,
  Ticket,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import { Button, LinkButton } from "@/components/ui/button";
import { Alert, Card, Skeleton } from "@/components/ui/feedback";
import { useAsync } from "@/hooks/use-async";
import { api, errorMessage } from "@/lib/api";
import { isOwnScope, useStaff } from "./admin-shell";
import type { DashboardStats } from "@/types/api";

const taka = (n: number) => `৳${n.toLocaleString("en-US")}`;

export function AdminDashboard() {
  const own = isOwnScope(useStaff());
  const stats = useAsync(() => api.adminStats());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted">
            {own ? "Figures for the members you registered." : "Live figures from the registration database."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={stats.reload} loading={stats.loading} icon={<RefreshCw className="h-4 w-4" aria-hidden />}>
            Refresh
          </Button>
          <LinkButton href="/backend/tokens" variant="gold" size="sm">
            <Printer className="h-4 w-4" aria-hidden /> Print All Tokens
          </LinkButton>
        </div>
      </div>

      {stats.error != null && <Alert tone="danger" title="Statistics unavailable">{errorMessage(stats.error)}</Alert>}
      {stats.loading && !stats.data && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      )}
      {stats.data && <StatsView stats={stats.data} own={own} />}
    </div>
  );
}

function StatsView({ stats, own }: { stats: DashboardStats; own: boolean }) {
  const cards: { label: string; value: string; icon: LucideIcon; tone: string; hint?: string }[] = [
    { label: own ? "Registered by me" : "Total registrations", value: String(stats.totalRegistrations), icon: ClipboardList, tone: "text-primary" },
    { label: "Active registrations", value: String(stats.activeRegistrations), icon: UserCheck, tone: "text-success" },
    { label: "Registered today", value: String(stats.registeredToday), icon: CalendarPlus, tone: "text-violet" },
    { label: "With driver", value: String(stats.withDriver), icon: Car, tone: "text-gold" },
    {
      label: "Registration amount",
      value: taka(stats.totalAmount),
      icon: BadgeDollarSign,
      tone: "text-gold",
      hint: "Sum of AmountPaid — payments are not verified",
    },
    { label: "With photo", value: String(stats.withPhoto), icon: Camera, tone: "text-primary" },
    { label: "Tokens ready to print", value: String(stats.tokensReady), icon: Ticket, tone: "text-success", hint: "Active + token number" },
    { label: "Pass codes issued", value: String(stats.withPassCode), icon: KeyRound, tone: "text-violet" },
  ];

  const maxSize = Math.max(1, ...stats.tShirtSizes.map((s) => s.total));

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, tone, hint }) => (
          <Card key={label} className="min-w-0 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs text-muted sm:text-sm">{label}</p>
              <Icon className={`h-5 w-5 shrink-0 ${tone}`} aria-hidden />
            </div>
            <p className="mt-2 text-2xl font-bold break-words tabular-nums sm:text-3xl">{value}</p>
            {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <h2 className="text-lg font-semibold">T-shirt sizes (active registrations)</h2>
        {stats.tShirtSizes.length === 0 ? (
          <p className="mt-3 text-sm text-muted">No registrations yet.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {stats.tShirtSizes.map((s) => (
              <li key={s.size} className="grid grid-cols-[3.5rem_1fr_3rem] items-center gap-3 text-sm">
                <span className="font-semibold">{s.size}</span>
                <span className="h-3 overflow-hidden rounded-full bg-surface-2">
                  <span className="block h-full rounded-full bg-primary" style={{ width: `${(s.total / maxSize) * 100}%` }} />
                </span>
                <span className="text-right tabular-nums">{s.total}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
