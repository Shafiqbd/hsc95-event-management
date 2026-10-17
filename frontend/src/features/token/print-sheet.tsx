"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { TokenData } from "@/types/api";
import { EntryPass } from "./entry-pass";
import { chunk, TOKENS_PER_PAGE, waitForImages, type ImageLoadReport } from "./print";

export function PrintPages({ tokens }: { tokens: TokenData[] }) {
  return (
    <>
      {chunk(tokens, TOKENS_PER_PAGE).map((page, pageIndex) => (
        <section key={pageIndex} className="print-page" aria-label={`Page ${pageIndex + 1}`}>
          {page.map((token, i) => (
            <EntryPass key={token.entryId ?? `${pageIndex}-${i}`} token={token} />
          ))}
        </section>
      ))}
    </>
  );
}

export type PrintPhase = "idle" | "loading-images" | "printing";

/**
 * Renders the tokens into a body-level container that is the only thing
 * visible in print media, waits for the background, every photo and the
 * web font, then opens ONE print dialog for all tokens.
 */
export function usePrintTokens() {
  const [tokens, setTokens] = useState<TokenData[] | null>(null);
  const [phase, setPhase] = useState<PrintPhase>("idle");
  const [report, setReport] = useState<ImageLoadReport | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!tokens || !containerRef.current) return;
    let cancelled = false;
    const container = containerRef.current;

    const afterPrint = () => {
      setTokens(null);
      setPhase("idle");
    };
    window.addEventListener("afterprint", afterPrint, { once: true });

    (async () => {
      const result = await waitForImages(container);
      await document.fonts?.ready;
      if (cancelled) return;
      setReport(result);
      setPhase("printing");
      window.print();
    })();

    return () => {
      cancelled = true;
      window.removeEventListener("afterprint", afterPrint);
    };
  }, [tokens]);

  const portal =
    tokens && typeof document !== "undefined"
      ? createPortal(
          <div className="print-root" ref={containerRef}>
            <PrintPages tokens={tokens} />
          </div>,
          document.body,
        )
      : null;

  return {
    print: (items: TokenData[]) => {
      if (items.length === 0 || phase !== "idle") return;
      setReport(null);
      setPhase("loading-images");
      setTokens(items);
    },
    phase,
    busy: phase !== "idle",
    report,
    portal,
  };
}
