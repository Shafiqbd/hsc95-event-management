"use client";

import { FileDown, Printer, X } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, Skeleton } from "@/components/ui/feedback";
import { RegistrationDetails, StatusBadges } from "@/features/registration/registration-details";
import { EntryPass, tokenFromRegistration } from "@/features/token/entry-pass";
import { usePrintTokens } from "@/features/token/print-sheet";
import { usePdfDownload } from "@/features/token/use-pdf-download";
import { useAsync } from "@/hooks/use-async";
import { api, errorMessage } from "@/lib/api";

/** Slide-over detail view, loaded fresh from GET /api/admin/registrations/:id. */
export function RegistrationDetailPanel({ entryId, onClose }: { entryId: number; onClose: () => void }) {
  const detail = useAsync(() => api.adminRegistration(entryId), String(entryId));
  const printer = usePrintTokens();
  const pdf = usePdfDownload();
  const r = detail.data;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="registration-detail-title">
      <button type="button" className="absolute inset-0 bg-black/50" aria-label="Close details" onClick={onClose} />
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-2xl flex-col border-l border-border bg-bg shadow-soft">
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <h2 id="registration-detail-title" className="text-lg font-semibold">
            Registration details
          </h2>
          <button type="button" onClick={onClose} aria-label="Close details" className="rounded-md p-2 hover:bg-surface-2" autoFocus>
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          {detail.loading && !r && (
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-80 w-full" />
            </div>
          )}
          {detail.error != null && <Alert tone="danger">{errorMessage(detail.error)}</Alert>}
          {r && (
            <>
              <StatusBadges registration={r} />
              <div className="grid gap-6 sm:grid-cols-[1fr_14rem]">
                <RegistrationDetails registration={r} />
                <div className="space-y-3">
                  {r.tokenReady ? (
                    <>
                      <div className="overflow-hidden rounded-md ring-1 ring-border">
                        <EntryPass token={tokenFromRegistration(r)} />
                      </div>
                      <Button
                        className="w-full"
                        variant="gold"
                        size="sm"
                        loading={printer.busy}
                        icon={<Printer className="h-4 w-4" aria-hidden />}
                        onClick={() => printer.print([tokenFromRegistration(r)])}
                      >
                        Print token
                      </Button>
                      <Button
                        className="w-full"
                        variant="secondary"
                        size="sm"
                        loading={pdf.busy}
                        icon={<FileDown className="h-4 w-4" aria-hidden />}
                        onClick={() => pdf.download([tokenFromRegistration(r)], `token-${r.formNo ?? r.entryId}.pdf`)}
                      >
                        Download PDF
                      </Button>
                      {pdf.error && <Alert tone="danger">{pdf.error}</Alert>}
                    </>
                  ) : (
                    <Alert tone="warning" title="Token not ready">
                      {!r.isActive ? "Registration is inactive." : !r.hasPhoto ? "No active photo." : "No form number assigned."}
                    </Alert>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </aside>
      {printer.portal}
    </div>
  );
}
