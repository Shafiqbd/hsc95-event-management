import { z } from "zod";
import { BLOOD_GROUPS, T_SHIRT_SIZES } from "@/config/event";

export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const BN_DIGITS = "০১২৩৪৫৬৭৮৯";

export function toAsciiDigits(value: string): string {
  return value.replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

/** Same normalisation as the backend: Bengali digits, spaces, dashes, +88. */
export function normalizeMobile(value: string): string {
  let digits = toAsciiDigits(value).replace(/[\s-]/g, "");
  if (digits.startsWith("+88")) digits = digits.slice(3);
  else if (digits.startsWith("88") && digits.length === 13) digits = digits.slice(2);
  return digits;
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `সর্বোচ্চ ${max} অক্ষর`)
    .optional()
    .or(z.literal(""));

export const registrationSchema = z.object({
  formNo: z
    .string()
    .trim()
    .refine((v) => v === "" || /^[0-9০-৯]{1,5}$/.test(v), "টোকেন নম্বর ১ থেকে ৯৯৯৯৯ এর মধ্যে হতে হবে")
    .refine((v) => v === "" || Number(toAsciiDigits(v)) >= 1, "টোকেন নম্বর ১ থেকে ৯৯৯৯৯ এর মধ্যে হতে হবে"),
  memberName: z.string().trim().min(2, "নাম লিখুন (কমপক্ষে ২ অক্ষর)").max(200, "নাম অনেক বড়"),
  collegeName: optionalText(200),
  thanaName: optionalText(100),
  zilaName: optionalText(100),
  workType: optionalText(150),
  bloodGroup: z.enum(BLOOD_GROUPS).optional().or(z.literal("")),
  workPlaceAddress: optionalText(500),
  mobileNo: z
    .string()
    .trim()
    .min(1, "মোবাইল নম্বর লিখুন")
    .refine((v) => /^01[3-9][0-9]{8}$/.test(normalizeMobile(v)), "সঠিক ১১ সংখ্যার মোবাইল নম্বর দিন (01XXXXXXXXX)"),
  facebookId: optionalText(200),
  tShirtSize: z.enum(T_SHIRT_SIZES.map((s) => s.value) as [string, ...string[]], {
    error: "টি-শার্ট সাইজ নির্বাচন করুন",
  }),
  includeDriver: z.boolean(),
  // Optional: when a photo is chosen it must still be a small JPG/PNG/WebP.
  photo: z
    .custom<File>((v) => typeof File !== "undefined" && v instanceof File)
    .refine((f) => PHOTO_TYPES.includes(f.type), "শুধু JPG, PNG বা WebP ছবি দেওয়া যাবে")
    .refine((f) => f.size <= PHOTO_MAX_BYTES, "ছবির আকার ২ মেগাবাইটের কম হতে হবে")
    .optional(),
  });

export type RegistrationInput = z.input<typeof registrationSchema>;
export type RegistrationValues = z.output<typeof registrationSchema>;

/** Build the multipart body the API expects. */
export function toFormData(values: RegistrationValues): FormData {
  const fd = new FormData();
  const text: Record<string, string | undefined> = {
    formNo: values.formNo ? String(Number(toAsciiDigits(values.formNo))) : undefined,
    memberName: values.memberName,
    collegeName: values.collegeName,
    thanaName: values.thanaName,
    zilaName: values.zilaName,
    workType: values.workType,
    bloodGroup: values.bloodGroup,
    workPlaceAddress: values.workPlaceAddress,
    mobileNo: normalizeMobile(values.mobileNo),
    facebookId: values.facebookId,
    tShirtSize: values.tShirtSize,
  };
  for (const [key, value] of Object.entries(text)) {
    if (value) fd.append(key, value);
  }
  fd.append("includeDriver", values.includeDriver ? "true" : "false");
  if (values.photo) fd.append("photo", values.photo);
  return fd;
}
