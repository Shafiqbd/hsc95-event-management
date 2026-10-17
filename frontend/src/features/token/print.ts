/** Tokens per A4 page: 2 columns x 3 rows of 70 x 87.14 mm (see globals.css). */
export const TOKENS_PER_PAGE = 6;

export function chunk<T>(items: readonly T[], size: number): T[][] {
  if (size < 1) throw new Error("size must be >= 1");
  const pages: T[][] = [];
  for (let i = 0; i < items.length; i += size) pages.push(items.slice(i, i + size));
  return pages;
}

export interface ImageLoadReport {
  total: number;
  failed: number;
}

/** Resolve once every <img> in the container has loaded (or failed) and decoded. */
export async function waitForImages(container: HTMLElement, timeoutMs = 20_000): Promise<ImageLoadReport> {
  const images = Array.from(container.querySelectorAll("img"));
  let failed = 0;

  const settle = (img: HTMLImageElement) =>
    new Promise<void>((resolve) => {
      const done = () => {
        if (img.naturalWidth === 0) failed += 1;
        resolve();
      };
      if (img.complete) {
        done();
        return;
      }
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    }).then(() => (img.naturalWidth > 0 ? img.decode().catch(() => undefined) : undefined));

  const all = Promise.all(images.map(settle)).then(() => ({ total: images.length, failed }));
  const timeout = new Promise<ImageLoadReport>((resolve) =>
    setTimeout(() => resolve({ total: images.length, failed: images.length }), timeoutMs),
  );
  return Promise.race([all, timeout]);
}
