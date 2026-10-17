import { ForbiddenException, Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { CookieOptions } from 'express';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import { DatabaseService } from '../database/database.service.js';
import type { SessionUserRow, UserLoginRow } from '../database/db-rows.js';
import { ROLES, type Role, type SessionTokenPayload, type SessionUser } from './auth.types.js';

const ACTIVE_USER_STATUS = 1;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly db: DatabaseService,
    private readonly jwt: JwtService,
    @Inject(APP_CONFIG) private readonly config: AppConfig,
  ) {}

  /** Map T_UserType.UserTypeName to an application role (null = no access). */
  resolveRole(userTypeName: string | null | undefined): Role | null {
    const name = userTypeName?.trim().toLowerCase();
    if (!name) return null;
    return ROLES.find((role) => this.config.roles[role].typeNames.includes(name)) ?? null;
  }

  /**
   * Validate credentials with hsc95.sp_user_login, then enforce UserStatus
   * (which sp_user_login ignores) and require a recognised user type.
   */
  async login(loginName: string, password: string): Promise<SessionUser> {
    const row = await this.db.callOne<UserLoginRow>(this.db.fn.userLogin, [loginName, password]);
    if (!row) throw new UnauthorizedException('Invalid login name or password');

    const user = await this.loadSessionUser(row.UserId);
    if (!user) {
      this.logger.warn(`Login refused for inactive or unmapped user ${row.UserId}`);
      throw new ForbiddenException('This account is not active. Please contact the administrator.');
    }
    return user;
  }

  /**
   * Load the current user state. Returns null when the user no longer
   * exists, is not active, or has a user type without application access.
   */
  async loadSessionUser(userId: number): Promise<SessionUser | null> {
    const row = await this.db.callOne<SessionUserRow>(this.db.fn.getSessionUser, [userId]);
    if (!row || Number(row.UserStatus) !== ACTIVE_USER_STATUS) return null;
    const role = this.resolveRole(row.UserTypeName);
    if (!role) return null;
    return {
      userId: row.UserId,
      fullName: row.FullName,
      loginName: row.LoginName,
      email: row.Email,
      contactNumber: row.ContactNumber,
      userTypeName: row.UserTypeName,
      role,
    };
  }

  async issueToken(user: SessionUser): Promise<string> {
    const payload: SessionTokenPayload = { sub: user.userId };
    return this.jwt.signAsync(payload);
  }

  async verifyToken(token: string): Promise<SessionTokenPayload | null> {
    try {
      const payload = await this.jwt.verifyAsync<SessionTokenPayload>(token);
      return Number.isInteger(payload.sub) ? payload : null;
    } catch {
      return null;
    }
  }

  get cookieName(): string {
    return this.config.auth.cookieName;
  }

  cookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.auth.cookieSecure,
      sameSite: this.config.auth.cookieSameSite,
      path: '/',
      maxAge: this.config.auth.sessionTtlHours * 60 * 60 * 1000,
    };
  }

  clearCookieOptions(): CookieOptions {
    const { maxAge: _maxAge, ...rest } = this.cookieOptions();
    return rest;
  }
}
