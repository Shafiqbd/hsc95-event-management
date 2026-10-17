import { formatFormNo } from "@/lib/format";
import type { TokenData } from "@/types/api";
import { TOKEN_BACKGROUND_SRC, TOKEN_GEOMETRY } from "./entry-pass";
import { TOKENS_PER_PAGE } from "./print";

/** Token size on paper, identical to the print stylesheet. */
const TOKEN_W_MM = 70;
const TOKEN_H_MM = (TOKEN_W_MM * 366) / 294;
const GAP_X_MM = 10;
const GAP_Y_MM = 5;
const PAGE_W_MM = 210;
const MARGIN_TOP_MM = 10;
const LEFT_MM = (PAGE_W_MM - (2 * TOKEN_W_MM + GAP_X_MM)) / 2;

/** ~300 dpi at 70 mm wide. */
const CANVAS_W = 827;
const CANVAS_H = Math.round((CANVAS_W * 366) / 294);

const imageCache = new Map<string, Promise<HTMLImageElement | null>>();

function loadImage(src: string): Promise<HTMLImageElement | null> {
  let cached = imageCache.get(src);
  if (!cached) {
    cached = new Promise((resolve) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
    imageCache.set(src, cached);
  }
  return cached;
}

const pct = (value: string) => Number.parseFloat(value) / 100;

/** Break text into at most `maxLines` lines that fit `maxWidth`. */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, maxLines: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width <= maxWidth || !line) line = candidate;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    kept[maxLines - 1] = `${kept[maxLines - 1]}…`;
    return kept;
  }
  return lines;
}

/** Draw one entry pass onto a canvas, mirroring the EntryPass component. */
async function renderToken(token: TokenData, fontFamily: string): Promise<HTMLCanvasElement> {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not supported in this browser");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  const background = await loadImage(TOKEN_BACKGROUND_SRC);
  if (!background) throw new Error("Token background image could not be loaded");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(background, 0, 0, CANVAS_W, CANVAS_H);

  // Photo: cover-fit, aligned to the top, clipped to the photo box.
  const p = TOKEN_GEOMETRY.photo;
  const px = pct(p.left) * CANVAS_W;
  const py = pct(p.top) * CANVAS_H;
  const pw = pct(p.width) * CANVAS_W;
  const ph = pct(p.height) * CANVAS_H;
  ctx.fillStyle = "#f3f1fa";
  ctx.fillRect(px, py, pw, ph);
  const photo = token.photoUrl ? await loadImage(token.photoUrl) : null;
  if (photo && photo.naturalWidth > 0) {
    const scale = Math.max(pw / photo.naturalWidth, ph / photo.naturalHeight);
    const sw = pw / scale;
    const sh = ph / scale;
    const sx = (photo.naturalWidth - sw) / 2;
    ctx.drawImage(photo, sx, 0, sw, sh, px, py, pw, ph);
  }

  // Name + form number, centred in the information box.
  const info = TOKEN_GEOMETRY.info;
  const ix = pct(info.left) * CANVAS_W;
  const iy = pct(info.top) * CANVAS_H;
  const iw = pct(info.width) * CANVAS_W;
  const ih = pct(info.height) * CANVAS_H;
  const nameSize = (token.memberName.length > 24 ? 0.054 : 0.066) * CANVAS_W;
  const formSize = 0.048 * CANVAS_W;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${nameSize}px ${fontFamily}`;
  const lines = wrap(ctx, token.memberName, iw - 0.04 * CANVAS_W, 2);
  const lineH = nameSize * 1.15;
  const gap = 0.012 * CANVAS_W;
  const blockH = lines.length * lineH + gap + formSize * 1.15;
  let y = iy + (ih - blockH) / 2 + lineH / 2;

  ctx.fillStyle = "#1d1b3a";
  for (const line of lines) {
    ctx.fillText(line, ix + iw / 2, y);
    y += lineH;
  }
  ctx.font = `600 ${formSize}px ${fontFamily}`;
  ctx.fillStyle = "#5b3fb0";
  ctx.fillText(`ফরম নং : ${formatFormNo(token.formNo)}`, ix + iw / 2, y - lineH / 2 + gap + (formSize * 1.15) / 2);

  return canvas;
}

export interface PdfProgress {
  done: number;
  total: number;
}

/**
 * Build an A4 PDF (6 tokens per page, same layout as printing) and trigger
 * a file download. Runs entirely in the browser.
 */
export async function downloadTokensPdf(
  tokens: TokenData[],
  fileName: string,
  onProgress?: (progress: PdfProgress) => void,
): Promise<void> {
  if (tokens.length === 0) return;
  const { jsPDF } = await import("jspdf");

  const fontFamily = getComputedStyle(document.body).fontFamily || "sans-serif";
  await Promise.all([
    document.fonts.load(`700 20px ${fontFamily}`, "অআ"),
    document.fonts.load(`600 20px ${fontFamily}`, "অআ"),
  ]).catch(() => undefined);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  doc.setProperties({ title: fileName, creator: "HSC 95 Society Event Management" });

  for (let i = 0; i < tokens.length; i += 1) {
    const slot = i % TOKENS_PER_PAGE;
    if (i > 0 && slot === 0) doc.addPage();
    const x = LEFT_MM + (slot % 2) * (TOKEN_W_MM + GAP_X_MM);
    const y = MARGIN_TOP_MM + Math.floor(slot / 2) * (TOKEN_H_MM + GAP_Y_MM);

    const canvas = await renderToken(tokens[i], fontFamily);
    doc.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", x, y, TOKEN_W_MM, TOKEN_H_MM, undefined, "FAST");

    // Dashed cutting guide.
    doc.setDrawColor(180);
    doc.setLineWidth(0.2);
    doc.setLineDashPattern([1.5, 1.5], 0);
    doc.rect(x, y, TOKEN_W_MM, TOKEN_H_MM);

    onProgress?.({ done: i + 1, total: tokens.length });
    // Yield so the progress label can update on large batches.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  doc.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
}
