import { liveApi, type ApiClient } from "./live-api";
import { mockApi } from "./mock-api";

export { ApiError, errorMessage } from "./api-error";
export type { ApiClient } from "./live-api";

/**
 * "mock" (default until the backend is connected): everything runs in the
 * browser with static demo data. "live": calls the NestJS API.
 */
export const API_MODE: "mock" | "live" = process.env.NEXT_PUBLIC_API_MODE === "live" ? "live" : "mock";

export const isMockMode = API_MODE === "mock";

export const api: ApiClient = isMockMode ? mockApi : liveApi;
