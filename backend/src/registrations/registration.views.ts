import type { EntryPassByIdRow, EntryPassRow, RegistrationRow } from '../database/db-rows.js';

/** API shape of a registration (camelCase, typed, no internal columns). */
export interface RegistrationView {
  entryId: number;
  formNo: number | null;
  memberName: string;
  collegeName: string | null;
  thanaName: string | null;
  zilaName: string | null;
  workType: string | null;
  bloodGroup: string | null;
  workPlaceAddress: string | null;
  mobileNo: string | null;
  facebookId: string | null;
  tShirtSize: string;
  includeDriver: boolean;
  amountPaid: number;
  /** No payment verification exists in the schema; see gap analysis. */
  paymentStatus: 'unverified';
  entryDate: string;
  passCode: string | null;
  isLocked: boolean;
  isActive: boolean;
  hasPhoto: boolean;
  photoUrl: string | null;
  tokenReady: boolean;
}

export interface TokenView {
  entryId: number | null;
  memberName: string;
  formNo: number | null;
  mobileNo: string | null;
  photoUrl: string | null;
}

export type PhotoUrlResolver = (photoPath: string | null) => string | null;

const toNumberOrNull = (value: string | null): number | null => (value === null ? null : Number(value));

export function toRegistrationView(row: RegistrationRow, photoUrl: PhotoUrlResolver): RegistrationView {
  const isActive = Number(row.MemberStatus) === 1;
  const hasPhoto = Boolean(row.PhotoPath);
  const formNo = toNumberOrNull(row.FormNo);
  return {
    entryId: row.EntryId,
    formNo,
    memberName: row.MemberName,
    collegeName: row.CollegeName,
    thanaName: row.ThanaName,
    zilaName: row.ZilaName,
    workType: row.WorkType,
    bloodGroup: row.BloodGroup,
    workPlaceAddress: row.WorkPlaceAddress,
    mobileNo: row.MobileNo,
    facebookId: row.FacebookId,
    tShirtSize: row.TShirtSize,
    includeDriver: row.IncludeDriver === 'Y',
    amountPaid: Number(row.AmountPaid),
    paymentStatus: 'unverified',
    entryDate: row.EntryDate,
    passCode: row.PassCode?.trim() || null,
    isLocked: row.MemberLock === 'Y',
    isActive,
    hasPhoto,
    photoUrl: photoUrl(row.PhotoPath),
    tokenReady: isActive && hasPhoto && formNo !== null,
  };
}

export function toTokenView(row: EntryPassRow | EntryPassByIdRow, photoUrl: PhotoUrlResolver): TokenView {
  return {
    entryId: 'EntryId' in row ? row.EntryId : null,
    memberName: row.MemberName,
    formNo: toNumberOrNull(row.FormNo),
    mobileNo: row.MobileNo,
    photoUrl: photoUrl(row.PhotoPath),
  };
}

/** Only http(s) URLs are passed through for PhotoPath values not managed by this app. */
export function externalPhotoUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null;
  } catch {
    return null;
  }
}
