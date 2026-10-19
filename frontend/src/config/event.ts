/**
 * Central event information for the public website.
 *
 * Display text lives here. The fees actually charged are decided by the
 * backend (EVENT_REGISTRATION_FEE / EVENT_DRIVER_FEE) and the registration
 * form reads them from GET /api/event. Keep `displayFees` in sync with the
 * backend when fees change.
 */
export const EVENT = {
  societyName: "এইচএসসি '৯৫ সোসাইটি",
  societyNameEn: "HSC 95 Society",
  celebration: "৩০ বছর পূর্তি উৎসব",
  celebrationEn: "30 Years Celebration",
  venue: "টিএসসি, ঢাকা বিশ্ববিদ্যালয়",
  venueEn: "TSC, University of Dhaka",
  /** ISO date of the event (local Bangladesh date). */
  dateIso: "2026-10-30",
  dateBn: "৩০ অক্টোবর, ২০২৬",
  welcome:
    "তিন দশকের বন্ধুত্ব, স্মৃতি আর পথচলা উদযাপনে এইচএসসি '৯৫ ব্যাচের সকল বন্ধুকে আন্তরিক শুভেচ্ছা ও আমন্ত্রণ।",
  displayFees: {
    registration: 1500,
    driver: 500,
  },
  /** Form numbers are shown zero-padded, e.g. ০০১২. */
  formNoPadLength: 4,
  /**
   * Physical facilities (food, gifts, transport, ...) are only listed once
   * the organiser confirms them. Add confirmed items here.
   */
  confirmedFacilities: [] as { title: string; description: string }[],
} as const;

export const T_SHIRT_SIZES = [
  { value: "M", label: "M", measure: "৩৮ × ২৮" },
  { value: "L", label: "L", measure: "৪০ × ২৯" },
  { value: "XL", label: "XL", measure: "৪৩ × ৩০" },
  { value: "XXL", label: "XXL", measure: "৪৫ × ৩১" },
] as const;

export type TShirtSize = (typeof T_SHIRT_SIZES)[number]["value"];

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

/** Stored in T_EventForm.Gender as M / F. */
export const GENDERS = [
  { value: "M", label: "পুরুষ" },
  { value: "F", label: "মহিলা" },
] as const;

export type Gender = (typeof GENDERS)[number]["value"];

export function genderLabel(value: string | null | undefined): string {
  return GENDERS.find((g) => g.value === value)?.label ?? "—";
}
