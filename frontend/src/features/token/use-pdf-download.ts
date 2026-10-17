"use client";

import { useState } from "react";
import type { TokenData } from "@/types/api";
import type { PdfProgress } from "./token-pdf";

export function usePdfDownload() {
  const [progress, setProgress] = useState<PdfProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const download = async (tokens: TokenData[], fileName: string) => {
    if (progress || tokens.length === 0) return;
    setError(null);
    setProgress({ done: 0, total: tokens.length });
    try {
      const { downloadTokensPdf } = await import("./token-pdf");
      await downloadTokensPdf(tokens, fileName, setProgress);
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF could not be created");
    } finally {
      setProgress(null);
    }
  };

  return { download, busy: progress !== null, progress, error };
}

export function pdfFileName(prefix: string): string {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${prefix}-${stamp}.pdf`;
}
