import { ApiError } from "./api-error";
import type {
  DashboardStats,
  EventFees,
  NewUser,
  Registration,
  RegistrationPage,
  RegistrationResult,
  SessionUser,
  TokenData,
  UserSummary,
} from "@/types/api";

/** Same-origin path; next.config.ts proxies it to the NestJS API. */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

interface ErrorBody {
  error?: { statusCode?: number; message?: string; details?: string[] };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  // Required by the backend CSRF guard on state-changing requests.
  headers.set("X-Requested-With", "XMLHttpRequest");
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...init,
      headers,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    throw new ApiError(0, "সার্ভারের সাথে সংযোগ করা যাচ্ছে না। ইন্টারনেট সংযোগ পরীক্ষা করুন।");
  }

  const body = (await response.json().catch(() => null)) as ({ data: T } & ErrorBody) | null;
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error?.message ?? `Request failed (${response.status})`,
      body?.error?.details ?? [],
    );
  }
  return (body as { data: T }).data;
}

const json = (value: unknown) => JSON.stringify(value);

export const liveApi = {
  event: () => request<EventFees>("/event"),

  me: () => request<SessionUser>("/auth/me"),
  login: (loginName: string, password: string) =>
    request<SessionUser>("/auth/login", { method: "POST", body: json({ loginName, password }) }),
  logout: () => request<{ loggedOut: true }>("/auth/logout", { method: "POST" }),

  register: (form: FormData) => request<RegistrationResult>("/registrations", { method: "POST", body: form }),

  adminStats: () => request<DashboardStats>("/admin/stats"),
  adminRegistrations: (params: { search?: string; page: number; pageSize: number }) => {
    const query = new URLSearchParams({ page: String(params.page), pageSize: String(params.pageSize) });
    if (params.search?.trim()) query.set("search", params.search.trim());
    return request<RegistrationPage>(`/admin/registrations?${query.toString()}`);
  },
  adminRegistration: (entryId: number) => request<Registration>(`/admin/registrations/${entryId}`),
  adminPrintData: (entryIds?: number[]) =>
    request<TokenData[]>(
      entryIds && entryIds.length > 0 ? `/admin/tokens/print-data?ids=${entryIds.join(",")}` : "/admin/tokens/print-data",
    ),
  adminUsers: () => request<UserSummary[]>("/admin/users"),
  createUser: (user: NewUser) => request<{ userId: number }>("/admin/users", { method: "POST", body: json(user) }),
};

export type ApiClient = typeof liveApi;
