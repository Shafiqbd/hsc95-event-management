"use client";

import { ChevronLeft, ChevronRight, Eye, FileDown, MessageSquareText, Printer, RefreshCw, Ticket, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { useToast } from "@/components/ui/toast";
import { EntryPass, TOKEN_H_PX, TOKEN_W_PX } from "@/features/token/entry-pass";
import { usePrintTokens } from "@/features/token/print-sheet";
import { pdfFileName, usePdfDownload } from "@/features/token/use-pdf-download";
import { api, errorMessage } from "@/lib/api";
import { SMS_BATCH_SIZE } from "@/lib/live-api";
import type { Registration, TokenData } from "@/types/api";
import { isOwnScope, useStaff } from "./admin-shell";
import { Pagination, RegistrationsTable, SearchBox } from "./registrations-table";
import { PAGE_SIZE, useRegistrationPage } from "./use-registration-page";

interface Preview {
  title: string;
  tokens: TokenData[];
}

export function TokensManager() {
  const { search, page, setPage, onSearch, result } = useRegistrationPage();
  const staff = useStaff();
  const own = isOwnScope(staff);
  const toast = useToast();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [smsProgress, setSmsProgress] = useState<{ done: number; total: number } | null>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState<"all" | "selected" | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const data = result.data;

  const toggle = useCallback((r: Registration) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(r.entryId)) next.delete(r.entryId);
      else next.add(r.entryId);
      return next;
    });
  }, []);

  const togglePage = useCallback((rows: Registration[], select: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const r of rows) {
        if (select) next.add(r.entryId);
        else next.delete(r.entryId);
      }
      return next;
    });
  }, []);

  /**
   * Admin: SMS every selected member their token number. Sent in batches so
   * each request stays well inside the proxy timeout; the button shows
   * progress until every batch is done.
   */
  const sendSms = async () => {
    const ids = [...selected];
    if (ids.length === 0 || smsProgress) return;
    if (!window.confirm(`Send the token number by SMS to ${ids.length} selected member${ids.length === 1 ? "" : "s"}?`)) return;

    let sent = 0;
    const failed: string[] = [];
    setSmsProgress({ done: 0, total: ids.length });
    try {
      for (let i = 0; i < ids.length; i += SMS_BATCH_SIZE) {
        const result = await api.sendTokenSms(ids.slice(i, i + SMS_BATCH_SIZE));
        sent += result.sent;
        failed.push(...result.failed.map((f) => `#${f.formNo ?? f.entryId}: ${f.reason}`));
        setSmsProgress({ done: Math.min(i + SMS_BATCH_SIZE, ids.length), total: ids.length });
      }
      if (failed.length === 0) {
        toast.success("SMS has been sent to all registered users", `${sent} message${sent === 1 ? "" : "s"} sent.`);
        setSelected(new Set());
      } else {
        toast.error(`${sent} SMS sent, ${failed.length} failed`, failed.slice(0, 3).join(" · ") + (failed.length > 3 ? " …" : ""));
      }
    } catch (error) {
      toast.error(sent > 0 ? `SMS stopped after ${sent} sent` : "SMS could not be sent", errorMessage(error));
    } finally {
      setSmsProgress(null);
    }
  };

  /** Always fetches the complete dataset from the server, never just the visible page. */
  const openPreview = async (mode: "all" | "selected") => {
    setPreviewError(null);
    setLoadingPreview(mode);
    try {
      const tokens = mode === "all" ? await api.adminPrintData() : await api.adminPrintData([...selected]);
      setPreview({ title: mode === "all" ? (own ? "All my tokens" : "All eligible tokens") : "Selected tokens", tokens });
    } catch (error) {
      setPreviewError(errorMessage(error));
    } finally {
      setLoadingPreview(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Tokens &amp; Printing</h1>
          <p className="text-sm text-muted">
            {own && "Tokens for the members you registered. "}A token is ready when the registration is active and has a token
            number; members without a photo print with an empty photo box.
          </p>
        </div>
        <Button
          size="lg"
          variant="gold"
          loading={loadingPreview === "all"}
          onClick={() => openPreview("all")}
          icon={<Printer className="h-5 w-5" aria-hidden />}
        >
          {own ? "Print All My Tokens" : "Print All Tokens"}
        </Button>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm">
          <span className="font-semibold tabular-nums">{selected.size}</span> selected
          {selected.size > 0 && (
            <button type="button" onClick={() => setSelected(new Set())} className="ml-3 text-primary hover:underline">
              Clear selection
            </button>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          {staff.role === "admin" && (
            <Button
              variant="secondary"
              size="sm"
              disabled={selected.size === 0}
              loading={smsProgress !== null}
              onClick={sendSms}
              icon={<MessageSquareText className="h-4 w-4" aria-hidden />}
            >
              {smsProgress ? `Sending SMS ${smsProgress.done}/${smsProgress.total}…` : "Send SMS"}
            </Button>
          )}
          <Button
            variant="primary"
            size="sm"
            disabled={selected.size === 0}
            loading={loadingPreview === "selected"}
            onClick={() => openPreview("selected")}
            icon={<Eye className="h-4 w-4" aria-hidden />}
          >
            Preview &amp; print selected
          </Button>
        </div>
      </Card>

      {previewError && <Alert tone="danger" title="Could not load print data">{previewError}</Alert>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBox onSearch={onSearch} />
        <Button variant="secondary" size="sm" onClick={result.reload} loading={result.loading} icon={<RefreshCw className="h-4 w-4" aria-hidden />}>
          Refresh
        </Button>
      </div>

      {result.error != null && <Alert tone="danger" title="Could not load registrations">{errorMessage(result.error)}</Alert>}
      {result.loading && !data && <Skeleton className="h-96 w-full" />}
      {data && data.items.length === 0 && (
        <EmptyState icon={Ticket} title={search ? "No matching registrations" : "No registrations yet"} />
      )}
      {data && data.items.length > 0 && (
        <>
          <RegistrationsTable rows={data.items} selection={{ selected, toggle, togglePage }} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPage={setPage} />
        </>
      )}

      {preview && <PrintPreview preview={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

function PrintPreview({ preview, onClose }: { preview: Preview; onClose: () => void }) {
  const printer = usePrintTokens();
  const pdf = usePdfDownload();
  const count = preview.tokens.length;
  const [index, setIndex] = useState(0);
  const current = preview.tokens[Math.min(index, count - 1)];
  const go = useCallback((step: number) => setIndex((i) => Math.min(Math.max(i + step, 0), count - 1)), [count]);
  const withoutPhoto = preview.tokens.filter((t) => !t.photoUrl).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg" role="dialog" aria-modal="true" aria-labelledby="print-preview-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div>
          <h2 id="print-preview-title" className="text-lg font-semibold">
            Print preview — {preview.title}
          </h2>
          <p className="text-sm text-muted">
            {count} token{count === 1 ? "" : "s"} · one per page on {TOKEN_W_PX} × {TOKEN_H_PX} px paper
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} icon={<X className="h-4 w-4" aria-hidden />}>
            Close
          </Button>
          <Button
            variant="primary"
            disabled={count === 0 || printer.busy}
            loading={pdf.busy}
            onClick={() => pdf.download(preview.tokens, pdfFileName("hsc95-tokens"))}
            icon={<FileDown className="h-4 w-4" aria-hidden />}
          >
            {pdf.progress ? `Creating PDF ${pdf.progress.done}/${pdf.progress.total}` : "Download PDF"}
          </Button>
          <Button
            variant="gold"
            disabled={count === 0 || pdf.busy}
            loading={printer.busy}
            onClick={() => printer.print(preview.tokens)}
            icon={<Printer className="h-4 w-4" aria-hidden />}
          >
            {printer.phase === "loading-images" ? "Loading photos…" : `Print all ${count}`}
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <Alert tone="info" title="Download or print">
          Load {TOKEN_W_PX} × {TOKEN_H_PX} px paper in the printer; every token prints on its own sheet, so nothing has to be cut.
          “Print this token” prints the one shown, “Print all” prints every token in one print dialog, and “Download PDF” saves
          the same pages as a file.
        </Alert>
        {pdf.error && <Alert tone="danger" title="PDF could not be created">{pdf.error}</Alert>}
        {withoutPhoto > 0 && (
          <Alert tone="warning" title={`${withoutPhoto} token(s) without a photo`}>
            They will print with an empty photo box.
          </Alert>
        )}
        {printer.report && printer.report.failed > 0 && (
          <Alert tone="warning" title={`${printer.report.failed} image(s) failed to load in the last print`}>
            Check those members&apos; photos and print again.
          </Alert>
        )}
        {count === 0 ? (
          <EmptyState icon={Ticket} title="No tokens to print">
            No active registration with a token number yet.
          </EmptyState>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <Button variant="secondary" size="sm" disabled={index === 0} onClick={() => go(-1)} icon={<ChevronLeft className="h-4 w-4" aria-hidden />}>
                Previous
              </Button>
              <p className="min-w-24 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                {Math.min(index, count - 1) + 1} / {count}
              </p>
              <Button variant="secondary" size="sm" disabled={index >= count - 1} onClick={() => go(1)}>
                Next
                <ChevronRight className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <div className="w-full overflow-hidden rounded-md shadow-soft ring-1 ring-border" style={{ maxWidth: TOKEN_W_PX }}>
              <EntryPass token={current} />
            </div>
            <Button
              variant="gold"
              size="sm"
              disabled={pdf.busy}
              loading={printer.busy}
              onClick={() => printer.print([current])}
              icon={<Printer className="h-4 w-4" aria-hidden />}
            >
              Print this token
            </Button>
            <ArrowKeys onStep={go} />
          </div>
        )}
      </div>
      {printer.portal}
    </div>
  );
}

/** ← / → move through the preview one token at a time. */
function ArrowKeys({ onStep }: { onStep: (step: number) => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") onStep(-1);
      if (e.key === "ArrowRight") onStep(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStep]);
  return null;
}
