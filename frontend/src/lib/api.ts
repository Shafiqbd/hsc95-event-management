import { liveApi, type ApiClient } from "./live-api";
import { mockApi } from "./mock-api";

export { ApiError, errorMessage } from "./api-error";
export type { ApiClient } from "./live-api";

/**
 * "live" when NEXT_PUBLIC_API_URL is set in frontend/.env: calls the NestJS
 * API. "mock" (no URL, or NEXT_PUBLIC_API_MODE=mock): static demo data in the
 * browser, no backend needed.
 */
export const API_MODE: "mock" | "live" =
  process.env.NEXT_PUBLIC_API_MODE === "mock"
    ? "mock"
    : process.env.NEXT_PUBLIC_API_MODE === "live" || process.env.NEXT_PUBLIC_API_URL
      ? "live"
      : "mock";

export const isMockMode = API_MODE === "mock";

export const api: ApiClient = isMockMode ? mockApi : liveApi;
