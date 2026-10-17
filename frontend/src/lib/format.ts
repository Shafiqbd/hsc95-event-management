import { EVENT } from "@/config/event";

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/** Replace ASCII digits with Bengali digits. */
export function toBnDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

/** ৳১,৫০০ */
export function formatTaka(amount: number): string {
  return `৳${toBnDigits(amount.toLocaleString("en-US"))}`;
}

/** Zero-padded Bengali form number, e.g. ০০১২. */
export function formatFormNo(formNo: number | null | undefined): string {
  if (formNo === null || formNo === undefined) return "—";
  return toBnDigits(String(formNo).padStart(EVENT.formNoPadLength, "0"));
}

/**
 * EntryDate comes from PostgreSQL as "YYYY-MM-DD HH:MM:SS(.ffffff)" in the
 * database's local time. Format without time-zone conversion so server and
 * client render the same text (no hydration mismatch).
 */
export function formatEntryDate(value: string | null | undefined): string {
  if (!value) return "—";
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value);
  if (!match) return value;
  const [, y, m, d, hh, mm] = match;
  return `${d}/${m}/${y} ${hh}:${mm}`;
}
