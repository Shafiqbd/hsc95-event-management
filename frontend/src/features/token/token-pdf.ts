import type { TokenData } from "@/types/api";
import {
  DEFAULT_AVATAR_SRC,
  TOKEN_BACKGROUND_SRC,
  TOKEN_GEOMETRY,
  TOKEN_H_PX,
  TOKEN_W_PX,
  tokenDetails,
} from "./entry-pass";

/**
 * PDF layout: every page is one token, and the page IS the paper size
 * (614 x 767 CSS px = 460.5 x 575.25 pt), so nothing has to be cut.
 * The artwork is stretched to that shape; the photo is cover-fitted.
 */
const PAGE_W_PT = TOKEN_W_PX * 0.75;
const PAGE_H_PT = TOKEN_H_PX * 0.75;

/** ~300 dpi (96 dpi CSS px x 3.125). */
const CANVAS_W = Math.round(TOKEN_W_PX * 3.125);
const CANVAS_H = Math.round(TOKEN_H_PX * 3.125);

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

/**
 * Set the largest font (down to 75% of `size`) at which `text` fits
 * `maxWidth`; if it still does not fit, shorten it with an ellipsis.
 */
function fitText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  weight: number,
  size: number,
  fontFamily: string,
): string {
  for (let s = size; s >= size * 0.75; s -= size * 0.05) {
    ctx.font = `${weight} ${s}px ${fontFamily}`;
    if (ctx.measureText(text).width <= maxWidth) return text;
  }
  let cut = text;
  while (cut.length > 1 && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

interface InfoLine {
  text: string;
  weight: number;
  size: number;
  color: string;
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
  let photo = token.photoUrl ? await loadImage(token.photoUrl) : null;
  if (!photo || photo.naturalWidth === 0) photo = await loadImage(DEFAULT_AVATAR_SRC);
  if (photo && photo.naturalWidth > 0) {
    const scale = Math.max(pw / photo.naturalWidth, ph / photo.naturalHeight);
    const sw = pw / scale;
    const sh = ph / scale;
    const sx = (photo.naturalWidth - sw) / 2;
    ctx.drawImage(photo, sx, 0, sw, sh, px, py, pw, ph);
  }

  // Member details, top to bottom: token no., name, mobile, T-shirt, driver.
  const info = TOKEN_GEOMETRY.info;
  const ix = pct(info.left) * CANVAS_W;
  const iy = pct(info.top) * CANVAS_H;
  const iw = pct(info.width) * CANVAS_W;
  const ih = pct(info.height) * CANVAS_H;
  const maxW = iw * 0.94;
  const cx = ix + iw / 2;

  const d = tokenDetails(token);
  const NAME_SCALE = 1.3;
  const LINE_H = 1.25;
  const lineCount = d.driver ? 5 : 4;
  // Base text size so every line (name a bit larger) fills ~92% of the box height.
  const s = (ih * 0.92) / ((lineCount - 1 + NAME_SCALE) * LINE_H);
  const lines: InfoLine[] = [
    { text: d.tokenNo, weight: 600, size: s, color: "#5b3fb0" },
    { text: d.name, weight: 700, size: s * NAME_SCALE, color: "#1d1b3a" },
    { text: d.mobile, weight: 500, size: s, color: "#1d1b3a" },
    { text: d.tShirt, weight: 500, size: s, color: "#1d1b3a" },
  ];

  let y = iy + (ih - lineCount * s * LINE_H - s * (NAME_SCALE - 1) * LINE_H) / 2;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (const line of lines) {
    const h = line.size * LINE_H;
    ctx.fillStyle = line.color;
    ctx.fillText(fitText(ctx, line.text, maxW, line.weight, line.size, fontFamily), cx, y + h / 2);
    y += h;
  }

  if (d.driver) {
    // Green "With Driver" pill on the bottom line.
    const h = s * LINE_H;
    ctx.font = `700 ${s * 0.95}px ${fontFamily}`;
    const padX = s * 0.6;
    const bw = ctx.measureText(d.driver).width + padX * 2;
    const bh = s * 1.15;
    const mid = y + h / 2;
    ctx.fillStyle = "#15803d";
    ctx.beginPath();
    ctx.roundRect(cx - bw / 2, mid - bh / 2, bw, bh, s * 0.25);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(d.driver, cx, mid);
  }

  return canvas;
}

export interface PdfProgress {
  done: number;
  total: number;
}

/**
 * Build a PDF with one 614 x 767 px token per page (token no., name,
 * mobile, T-shirt size and driver) and trigger a file download.
 * Runs entirely in the browser.
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

  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: [PAGE_W_PT, PAGE_H_PT], compress: true });
  doc.setProperties({ title: fileName, creator: "HSC 95 Society Event Management" });

  for (let i = 0; i < tokens.length; i += 1) {
    if (i > 0) doc.addPage([PAGE_W_PT, PAGE_H_PT], "portrait");
    const canvas = await renderToken(tokens[i], fontFamily);
    doc.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, PAGE_W_PT, PAGE_H_PT, undefined, "FAST");

    onProgress?.({ done: i + 1, total: tokens.length });
    // Yield so the progress label can update on large batches.
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  doc.save(fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`);
}
