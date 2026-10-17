"use client";

import { ClipboardList, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, EmptyState, Skeleton } from "@/components/ui/feedback";
import { errorMessage } from "@/lib/api";
import { isOwnScope, useStaff } from "./admin-shell";
import { RegistrationDetailPanel } from "./registration-detail-panel";
import { Pagination, RegistrationsTable, SearchBox } from "./registrations-table";
import { PAGE_SIZE, useRegistrationPage } from "./use-registration-page";

export function RegistrationsView() {
  const { search, page, setPage, onSearch, result } = useRegistrationPage();
  const [openId, setOpenId] = useState<number | null>(null);
  const own = isOwnScope(useStaff());
  const data = result.data;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{own ? "My Registrations" : "Registrations"}</h1>
        <p className="text-sm text-muted">
          {own ? "Only the members you registered. " : ""}Search by member name, mobile number or form number.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBox onSearch={onSearch} />
        <Button variant="secondary" size="sm" onClick={result.reload} loading={result.loading} icon={<RefreshCw className="h-4 w-4" aria-hidden />}>
          Refresh
        </Button>
      </div>

      {result.error != null && <Alert tone="danger" title="Could not load registrations">{errorMessage(result.error)}</Alert>}
      {result.loading && !data && <Skeleton className="h-96 w-full" />}
      {data && data.items.length === 0 && (
        <EmptyState icon={ClipboardList} title={search ? "No matching registrations" : "No registrations yet"}>
          {search ? `Nothing matches “${search}”.` : own ? "Members you register will appear here." : "Registrations will appear here as they are entered."}
        </EmptyState>
      )}
      {data && data.items.length > 0 && (
        <>
          <RegistrationsTable rows={data.items} onOpen={(r) => setOpenId(r.entryId)} />
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPage={setPage} />
        </>
      )}

      {openId !== null && <RegistrationDetailPanel entryId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
