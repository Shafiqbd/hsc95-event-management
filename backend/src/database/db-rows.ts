/**
 * Row shapes returned by the PostgreSQL functions, exactly as node-postgres
 * delivers them. numeric/bigint arrive as strings, timestamps as strings
 * (see the type parsers in database.service.ts).
 */

/** hsc95.sp_user_login (db.txt) */
export interface UserLoginRow {
  UserId: number;
  FullName: string;
  LoginName: string;
  ContactNumber: string | null;
  EmailAddress: string;
  UserTypeName: string;
}

/** hsc95.sp_get_user_list (db.txt) */
export interface UserListRow {
  UserId: number;
  FullName: string;
  LoginName: string;
  UserTypeName: string;
}

/** hsc95.sp_prepare_entrypass (db.txt) */
export interface EntryPassRow {
  MemberName: string;
  FormNo: string | null;
  MobileNo: string | null;
  PhotoPath: string;
}

/** hsc95.sp_get_entrypass_by_ids (001) */
export interface EntryPassByIdRow extends EntryPassRow {
  EntryId: number;
}

/** hsc95.sp_get_session_user (001) */
export interface SessionUserRow {
  UserId: number;
  FullName: string;
  LoginName: string;
  Email: string;
  ContactNumber: string | null;
  UserTypeName: string;
  UserStatus: string;
}

/** hsc95.sp_check_registration_duplicate (001) */
export interface DuplicateCheckRow {
  MobileNoExists: boolean;
  FormNoExists: boolean;
}

/** hsc95.sp_get_registration_by_id (001) */
export interface RegistrationRow {
  EntryId: number;
  FormNo: string | null;
  MemberName: string;
  CollegeName: string | null;
  ThanaName: string | null;
  ZilaName: string | null;
  WorkType: string | null;
  BloodGroup: string | null;
  WorkPlaceAddress: string | null;
  MobileNo: string | null;
  FacebookId: string | null;
  TShirtSize: string;
  IncludeDriver: string;
  AmountPaid: string;
  EntryDate: string;
  PassCode: string | null;
  MemberLock: string;
  MemberStatus: string;
  PhotoPath: string | null;
}

/** hsc95.sp_get_registration_list (001) */
export interface RegistrationListRow extends RegistrationRow {
  TotalCount: string;
}

/** hsc95.sp_get_dashboard_stats (001) */
export interface DashboardStatsRow {
  TotalRegistrations: string;
  ActiveRegistrations: string;
  WithDriver: string;
  TotalAmount: string;
  WithPhoto: string;
  TokensReady: string;
  WithPassCode: string;
  RegisteredToday: string;
}

/** hsc95.sp_get_tshirt_summary (001) */
export interface TShirtSummaryRow {
  TShirtSize: string;
  Total: string;
}
