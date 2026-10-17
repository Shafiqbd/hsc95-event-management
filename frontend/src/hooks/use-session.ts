"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { SessionUser } from "@/types/api";

export const LOGIN_PATH = "/backend/login";

type SessionState =
  | { status: "loading" }
  | { status: "ready"; user: SessionUser }
  | { status: "error"; error: unknown };

/**
 * Client-side session check for the staff area. This is only for UX:
 * every API call is independently authorised by the backend.
 */
export function useSession() {
  const router = useRouter();
  const [state, setState] = useState<SessionState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    api.me().then(
      (user) => active && setState({ status: "ready", user }),
      (error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) router.replace(LOGIN_PATH);
        else setState({ status: "error", error });
      },
    );
    return () => {
      active = false;
    };
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      router.replace(LOGIN_PATH);
    }
  }, [router]);

  return { state, logout };
}
