"use client";

import { useCallback, useState } from "react";
import { useAsync } from "@/hooks/use-async";
import { api } from "@/lib/api";

export const PAGE_SIZE = 20;

/** Search + pagination state over GET /api/admin/registrations. */
export function useRegistrationPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const result = useAsync(() => api.adminRegistrations({ search, page, pageSize: PAGE_SIZE }), `${page}|${search}`);

  const onSearch = useCallback((value: string) => {
    setSearch(value);
    setPage(1);
  }, []);

  return { search, page, setPage, onSearch, result };
}
