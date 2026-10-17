"use client";

import { Eye, FileDown, Printer, RefreshCw, Ticket, X } from "lucide-react";
import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, Card, EmptyState, Skeleton } from "@/components/ui/feedback";
import { EntryPass } from "@/features/token/entry-pass";
import { TOKENS_PER_PAGE } from "@/features/token/print";
import { usePrintTokens } from "@/features/token/print-sheet";
import { pdfFileName, usePdfDownload } from "@/features/token/use-pdf-download";
import { api, errorMessage } from "@/lib/api";
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
  const own = isOwnScope(useStaff());
  const [selected, setSelected] = useState<Set<number>>(new Set());
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
            {own && "Tokens for the members you registered. "}A token is ready when the registration is active, has a photo and a form
            number.
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
  const pages = Math.ceil(count / TOKENS_PER_PAGE);
  const withoutPhoto = preview.tokens.filter((t) => !t.photoUrl).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg" role="dialog" aria-modal="true" aria-labelledby="print-preview-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
        <div>
          <h2 id="print-preview-title" className="text-lg font-semibold">
            Print preview — {preview.title}
          </h2>
          <p className="text-sm text-muted">
            {count} token{count === 1 ? "" : "s"} · {pages} A4 page{pages === 1 ? "" : "s"} ({TOKENS_PER_PAGE} per page, 70 × 87 mm)
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
            {printer.phase === "loading-images" ? "Loading photos…" : `Print ${count}`}
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-5">
        <Alert tone="info" title="Download or print">
          “Download PDF” saves an A4 file (6 tokens per page, with cutting guides). “Print” opens one print dialog for all tokens.
        </Alert>
        {pdf.error && <Alert tone="danger" title="PDF could not be created">{pdf.error}</Alert>}
        {withoutPhoto > 0 && (
          <Alert tone="warning" title={`${withoutPhoto} token(s) without a usable photo`}>
            Their photo path is not a managed upload or URL. They will print with an empty photo box.
          </Alert>
        )}
        {printer.report && printer.report.failed > 0 && (
          <Alert tone="warning" title={`${printer.report.failed} image(s) failed to load in the last print`}>
            Check those members&apos; photos and print again.
          </Alert>
        )}
        {count === 0 ? (
          <EmptyState icon={Ticket} title="No tokens to print">
            No registration currently has both an active photo and a form number.
          </EmptyState>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {preview.tokens.map((token, i) => (
              <div key={token.entryId ?? i} className="overflow-hidden rounded-md ring-1 ring-border">
                <EntryPass token={token} />
              </div>
            ))}
          </div>
        )}
      </div>
      {printer.portal}
    </div>
  );
}
