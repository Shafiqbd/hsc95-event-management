import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { TokenData } from "@/types/api";
import { DEFAULT_AVATAR_SRC, EntryPass, TOKEN_BACKGROUND_SRC } from "./entry-pass";
import { chunk, TOKENS_PER_PAGE, waitForImages } from "./print";
import { PrintPages } from "./print-sheet";

const token = (i: number, photoUrl: string | null = `/api/admin/photos/${i}.jpg`): TokenData => ({
  entryId: i,
  memberName: `সদস্য ${i}`,
  formNo: i,
  mobileNo: null,
  photoUrl,
  collegeName: null,
  tShirtSize: "L",
  includeDriver: false,
});

describe("EntryPass", () => {
  it("renders the supplied background, the photo, the name and the Bengali form number", () => {
    const { container } = render(<EntryPass token={{ ...token(12), memberName: "করিম আহমেদ" }} />);
    const imgs = container.querySelectorAll("img");
    expect(imgs[0]).toHaveAttribute("src", TOKEN_BACKGROUND_SRC);
    expect(screen.getByAltText("করিম আহমেদ এর ছবি")).toHaveAttribute("src", "/api/admin/photos/12.jpg");
    expect(screen.getByText("করিম আহমেদ")).toBeInTheDocument();
    expect(screen.getByText("টোকেন নং : ০০১২")).toBeInTheDocument();
  });

  it("lists token no., name, mobile, T-shirt size and the driver badge in order (no college)", () => {
    const { container } = render(
      <EntryPass
        token={{ ...token(7), memberName: "রহিম", collegeName: "ঢাকা কলেজ", mobileNo: "01711111111", tShirtSize: "XL", includeDriver: true }}
      />,
    );
    const texts = [...container.querySelectorAll("p")].map((p) => p.textContent);
    expect(texts).toEqual([
      "টোকেন নং : ০০০৭",
      "রহিম",
      "মোবাইল : 01711111111",
      "টি-শার্ট সাইজ : XL",
      "With Driver",
    ]);
    render(<EntryPass token={token(8)} />);
    expect(screen.getAllByText("With Driver")).toHaveLength(1);
  });

  it("shows the default avatar when there is no photo", () => {
    render(<EntryPass token={token(3, null)} />);
    expect(screen.getByAltText("ছবি নেই")).toHaveAttribute("src", DEFAULT_AVATAR_SRC);
  });
});

describe("bulk print layout", () => {
  it("chunks items into pages", () => {
    expect(TOKENS_PER_PAGE).toBe(1);
    expect(chunk([1, 2, 3, 4, 5, 6, 7], 6)).toEqual([[1, 2, 3, 4, 5, 6], [7]]);
    expect(chunk([], 6)).toEqual([]);
  });

  it("prints every token on its own page (one sheet per token)", () => {
    const tokens = Array.from({ length: 13 }, (_, i) => token(i + 1));
    const { container } = render(<PrintPages tokens={tokens} />);
    expect(container.querySelectorAll(".print-page")).toHaveLength(13);
    expect(container.querySelectorAll(".print-page > .entry-pass")).toHaveLength(13);
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
