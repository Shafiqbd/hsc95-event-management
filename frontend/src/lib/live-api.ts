import { ApiError } from "./api-error";
import type {
  DashboardStats,
  EventFees,
  NewUser,
  Registration,
  RegistrationPage,
  RegistrationResult,
  SessionUser,
  SmsBatchResult,
  TokenData,
  UserSummary,
} from "@/types/api";

/** The NestJS API, called directly by the browser (set in frontend/.env). */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api").replace(/\/+$/, "");

/**
 * The API returns its own files as paths ("/api/admin/photos/95-0043.jpg");
 * make them absolute so the browser loads them from the API server. Full
 * URLs (e.g. https://hsc95society.com/...) are kept as they are.
 */
export function apiAssetUrl(url: string | null): string | null {
  if (!url || /^(https?:|data:|blob:)/i.test(url)) return url;
  return new URL(url, `${API_URL}/`).toString();
}

const withAssetUrl = <T extends { photoUrl: string | null }>(item: T): T => ({ ...item, photoUrl: apiAssetUrl(item.photoUrl) });

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
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      // The API is another origin: send/receive the HttpOnly session cookie.
      credentials: "include",
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
    return request<RegistrationPage>(`/admin/registrations?${query.toString()}`).then((page) => ({
      ...page,
      items: page.items.map(withAssetUrl),
    }));
  },
  adminRegistration: (entryId: number) => request<Registration>(`/admin/registrations/${entryId}`).then(withAssetUrl),
  adminPrintData: (entryIds?: number[]) =>
    request<TokenData[]>(
      entryIds && entryIds.length > 0 ? `/admin/tokens/print-data?ids=${entryIds.join(",")}` : "/admin/tokens/print-data",
    ).then((tokens) => tokens.map(withAssetUrl)),
  adminUsers: () => request<UserSummary[]>("/admin/users"),
  createUser: (user: NewUser) => request<{ userId: number }>("/admin/users", { method: "POST", body: json(user) }),
  /** One batch of at most SMS_BATCH_SIZE registrations (Admin only). */
  sendTokenSms: (entryIds: number[]) =>
    request<SmsBatchResult>("/admin/sms/token-numbers", { method: "POST", body: json({ entryIds }) }),
};

/** Must not exceed the backend's SMS_BATCH_MAX; small enough for the 30 s proxy timeout. */
export const SMS_BATCH_SIZE = 25;

export type ApiClient = typeof liveApi;
