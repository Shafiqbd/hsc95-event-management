import { describe, expect, it } from "vitest";
import { API_URL, apiAssetUrl } from "./live-api";

describe("API address", () => {
  it("defaults to the local NestJS API", () => {
    expect(API_URL).toBe("http://localhost:4000/api");
  });

  it("turns API file paths into absolute URLs and keeps full URLs", () => {
    expect(apiAssetUrl("/api/admin/photos/95-0043.jpg")).toBe("http://localhost:4000/api/admin/photos/95-0043.jpg");
    expect(apiAssetUrl("https://hsc95society.com/photos/a.jpg")).toBe("https://hsc95society.com/photos/a.jpg");
    expect(apiAssetUrl("blob:http://localhost:3000/x")).toBe("blob:http://localhost:3000/x");
    expect(apiAssetUrl(null)).toBeNull();
  });
});
