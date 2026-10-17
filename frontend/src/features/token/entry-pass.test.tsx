import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TokenData } from "@/types/api";
import { EntryPass, TOKEN_BACKGROUND_SRC } from "./entry-pass";
import { chunk, TOKENS_PER_PAGE, waitForImages } from "./print";
import { PrintPages } from "./print-sheet";

const token = (i: number, photoUrl: string | null = `/api/admin/photos/${i}.jpg`): TokenData => ({
  entryId: i,
  memberName: `সদস্য ${i}`,
  formNo: i,
  mobileNo: null,
  photoUrl,
});

describe("EntryPass", () => {
  it("renders the supplied background, the photo, the name and the Bengali form number", () => {
    const { container } = render(<EntryPass token={{ ...token(12), memberName: "করিম আহমেদ" }} />);
    const imgs = container.querySelectorAll("img");
    expect(imgs[0]).toHaveAttribute("src", TOKEN_BACKGROUND_SRC);
    expect(screen.getByAltText("করিম আহমেদ এর ছবি")).toHaveAttribute("src", "/api/admin/photos/12.jpg");
    expect(screen.getByText("করিম আহমেদ")).toBeInTheDocument();
    expect(screen.getByText("ফরম নং : ০০১২")).toBeInTheDocument();
  });

  it("shows a placeholder when there is no photo", () => {
    render(<EntryPass token={token(3, null)} />);
    expect(screen.getByLabelText("ছবি নেই")).toBeInTheDocument();
  });
});

describe("bulk print layout", () => {
  it("chunks tokens into A4 pages of six", () => {
    expect(chunk([1, 2, 3, 4, 5, 6, 7], TOKENS_PER_PAGE)).toEqual([[1, 2, 3, 4, 5, 6], [7]]);
    expect(chunk([], 6)).toEqual([]);
  });

  it("renders every token, split into print pages", () => {
    const tokens = Array.from({ length: 13 }, (_, i) => token(i + 1));
    const { container } = render(<PrintPages tokens={tokens} />);
    expect(container.querySelectorAll(".print-page")).toHaveLength(3);
    expect(container.querySelectorAll(".entry-pass")).toHaveLength(13);
  });

  it("waits for images and reports failures", async () => {
    const div = document.createElement("div");
    const ok = document.createElement("img");
    const bad = document.createElement("img");
    Object.defineProperty(ok, "complete", { value: true });
    Object.defineProperty(ok, "naturalWidth", { value: 100 });
    Object.defineProperty(bad, "complete", { value: true });
    Object.defineProperty(bad, "naturalWidth", { value: 0 });
    ok.decode = () => Promise.resolve();
    div.append(ok, bad);
    await expect(waitForImages(div)).resolves.toEqual({ total: 2, failed: 1 });
  });
});
