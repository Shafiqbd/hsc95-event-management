/* eslint-disable @next/next/no-img-element -- session-protected API photos */
"use client";

import { ChevronLeft, ChevronRight, Search, UserRound } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/feedback";
import { boxInputClass } from "@/components/ui/form-line";
import { formatEntryDate, formatFormNo } from "@/lib/format";
import type { Registration } from "@/types/api";

/** Debounced search box (name, mobile number or exact form number). */
export function SearchBox({ onSearch }: { onSearch: (value: string) => void }) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const id = setTimeout(() => onSearch(value.trim()), 350);
    return () => clearTimeout(id);
  }, [value, onSearch]);

  return (
    <div className="relative w-full max-w-sm">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
      <label htmlFor="registration-search" className="sr-only">
        Search registrations
      </label>
      <input
        id="registration-search"
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Search name, mobile or form no."
        className={`${boxInputClass} pl-9`}
      />
    </div>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 text-sm">
      <p className="text-muted">
        Showing <span className="font-semibold text-fg">{from}</span>–<span className="font-semibold text-fg">{to}</span> of{" "}
        <span className="font-semibold text-fg">{total}</span>
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-surface px-3 disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden /> Prev
        </button>
        <span className="tabular-nums text-muted">
          {page} / {pages}
        </span>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="inline-flex h-9 items-center gap-1 rounded-md border border-border bg-surface px-3 disabled:opacity-50"
        >
          Next <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </nav>
  );
}

export function Thumb({ url, name }: { url: string | null; name: string }) {
  return (
    <span className="flex h-11 w-9 shrink-0 items-center justify-center overflow-hidden rounded-md bg-surface-2 ring-1 ring-border">
      {url ? (
        <img src={url} alt={`${name} photo`} loading="lazy" className="h-full w-full object-cover object-top" />
      ) : (
        <UserRound className="h-4 w-4 text-muted" aria-hidden />
      )}
    </span>
  );
}

interface Column {
  header: string;
  className?: string;
  cell: (r: Registration) => ReactNode;
}

const COLUMNS: Column[] = [
  { header: "Form No", cell: (r) => <span className="font-semibold tabular-nums">{formatFormNo(r.formNo)}</span> },
  {
    header: "Member",
    cell: (r) => (
      <span className="flex items-center gap-3">
        <Thumb url={r.photoUrl} name={r.memberName} />
        <span className="font-medium">{r.memberName}</span>
      </span>
    ),
  },
  { header: "Mobile", cell: (r) => <span className="tabular-nums">{r.mobileNo ?? "—"}</span> },
  { header: "T-shirt", cell: (r) => r.tShirtSize },
  { header: "Driver", cell: (r) => (r.includeDriver ? <Badge tone="gold">Yes</Badge> : <span className="text-muted">No</span>) },
  { header: "Amount", className: "text-right", cell: (r) => <span className="tabular-nums">৳{r.amountPaid.toLocaleString("en-US")}</span> },
  { header: "Registered", cell: (r) => <span className="whitespace-nowrap text-muted">{formatEntryDate(r.entryDate)}</span> },
  {
    header: "Token",
    cell: (r) =>
      !r.isActive ? <Badge tone="danger">Inactive</Badge> : r.tokenReady ? <Badge tone="success">Ready</Badge> : <Badge>Pending</Badge>,
  },
  {
    header: "SMS Sent",
    className: "text-center",
    cell: (r) =>
      r.smsSent > 0 ? (
        <Badge tone="info">{r.smsSent}</Badge>
      ) : (
        <span className="text-muted tabular-nums">0</span>
      ),
  },
];

export function RegistrationsTable({
  rows,
  onOpen,
  selection,
}: {
  rows: Registration[];
  onOpen?: (r: Registration) => void;
  selection?: {
    selected: ReadonlySet<number>;
    toggle: (r: Registration) => void;
    togglePage: (rows: Registration[], select: boolean) => void;
  };
}) {
  const selectable = rows.filter((r) => r.tokenReady);
  const allPageSelected = selection && selectable.length > 0 && selectable.every((r) => selection.selected.has(r.entryId));

  return (
    // relative: keeps absolutely positioned children (the sr-only "Actions" label) inside the scroll box,
    // otherwise they widen the whole page on phones.
    <div className="relative overflow-x-auto rounded-md border border-border bg-surface">
      <table className="w-full min-w-[56rem] text-left text-sm">
        <thead className="border-b border-border bg-surface-2 text-xs uppercase tracking-wide text-muted">
          <tr>
            {selection && (
              <th scope="col" className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  aria-label="Select all ready tokens on this page"
                  checked={Boolean(allPageSelected)}
                  disabled={selectable.length === 0}
                  onChange={(e) => selection.togglePage(selectable, e.target.checked)}
                  className="h-4 w-4 accent-[var(--primary)]"
                />
              </th>
            )}
            {COLUMNS.map((c) => (
              <th key={c.header} scope="col" className={`px-4 py-3 font-semibold ${c.className ?? ""}`}>
                {c.header}
              </th>
            ))}
            {onOpen && <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.entryId} className="transition-colors hover:bg-surface-2/60">
              {selection && (
                <td className="px-4 py-2.5">
                  <input
                    type="checkbox"
                    aria-label={`Select token for ${r.memberName}`}
                    checked={selection.selected.has(r.entryId)}
                    disabled={!r.tokenReady}
                    onChange={() => selection.toggle(r)}
                    className="h-4 w-4 accent-[var(--primary)]"
                  />
                </td>
              )}
              {COLUMNS.map((c) => (
                <td key={c.header} className={`px-4 py-2.5 ${c.className ?? ""}`}>
                  {c.cell(r)}
                </td>
              ))}
              {onOpen && (
                <td className="px-4 py-2.5 text-right">
                  <button type="button" onClick={() => onOpen(r)} className="rounded-md px-3 py-1.5 font-semibold text-primary hover:bg-primary/10">
                    View
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
