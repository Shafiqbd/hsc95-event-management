/** Mirrors the NestJS API response shapes. */

/** Staff roles, mapped from hsc95."T_UserType" (Admin, Register, Report Viewer). */
export type Role = "admin" | "register" | "viewer";

export interface SessionUser {
  userId: number;
  fullName: string;
  loginName: string;
  email: string;
  contactNumber: string | null;
  userTypeName: string;
  role: Role;
}

export interface Registration {
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
  paymentStatus: "unverified";
  entryDate: string;
  passCode: string | null;
  isLocked: boolean;
  isActive: boolean;
  hasPhoto: boolean;
  photoUrl: string | null;
  tokenReady: boolean;
}

export interface TokenData {
  entryId: number | null;
  memberName: string;
  formNo: number | null;
  mobileNo: string | null;
  photoUrl: string | null;
  collegeName: string | null;
  tShirtSize: string | null;
  includeDriver: boolean;
}

/** Result of one SMS batch (POST /admin/sms/token-numbers). */
export interface SmsBatchResult {
  requested: number;
  sent: number;
  failed: { entryId: number; formNo: number | null; mobileNo: string | null; reason: string }[];
}

export interface RegistrationPage {
  items: Registration[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DashboardStats {
  totalRegistrations: number;
  activeRegistrations: number;
  withDriver: number;
  totalAmount: number;
  withPhoto: number;
  tokensReady: number;
  withPassCode: number;
  registeredToday: number;
  tShirtSizes: { size: string; total: number }[];
}

export interface EventFees {
  registrationFee: number;
  driverFee: number;
}

export interface RegistrationResult {
  entryId: number;
  formNo: number;
  amountPaid: number;
  paymentStatus: "unverified";
}

export interface NewUser {
  fullName: string;
  loginName: string;
  password: string;
  email: string;
  contactNumber?: string;
  role: Role;
}

export interface UserSummary {
  userId: number;
  fullName: string;
  loginName: string;
  userTypeName: string;
}
