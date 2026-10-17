export const ROLES_KEY = 'hsc95:roles';

/** Application roles, mapped from hsc95."T_UserType". */
export type Role = 'admin' | 'register' | 'viewer';

export const ROLES: readonly Role[] = ['admin', 'register', 'viewer'];

/**
 * Which registrations a user may read: Register users only the forms they
 * entered (EntryBy = their UserId), everyone else all forms (null).
 */
export function entryScope(user: Pick<SessionUser, 'role' | 'userId'>): number | null {
  return user.role === 'register' ? user.userId : null;
}

/** The authenticated user, always re-read from the database per request. */
export interface SessionUser {
  userId: number;
  fullName: string;
  loginName: string;
  email: string;
  contactNumber: string | null;
  userTypeName: string;
  role: Role;
}

export interface SessionTokenPayload {
  sub: number;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: SessionUser;
  }
}
