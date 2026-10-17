import { Transform } from 'class-transformer';

/** Remove control characters, collapse runs of whitespace and trim. */
export function cleanText(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  // eslint-disable-next-line no-control-regex
  return value.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Like cleanText, but empty strings become undefined (optional fields). */
export function cleanOptionalText(value: unknown): unknown {
  const cleaned = cleanText(value);
  return cleaned === '' ? undefined : cleaned;
}

export const CleanText = () => Transform(({ value }) => cleanText(value));
export const CleanOptionalText = () => Transform(({ value }) => cleanOptionalText(value));

/** multipart/form-data sends booleans as strings. */
export const ToBoolean = () =>
  Transform(({ value }) => {
    if (typeof value === 'boolean') return value;
    if (value === 'true' || value === '1' || value === 'Y') return true;
    if (value === 'false' || value === '0' || value === 'N' || value === '' || value === undefined) return false;
    return value;
  });
