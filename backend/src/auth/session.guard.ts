import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service.js';
import { ROLES_KEY, type Role } from './auth.types.js';

/**
 * Verifies the HttpOnly session cookie, then re-reads the user from the
 * database on every request so deactivation or a user-type change takes
 * effect immediately. The role always comes from the database, never from
 * the token or the client.
 */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const token: unknown = request.cookies?.[this.auth.cookieName];
    if (typeof token !== 'string' || !token) throw new UnauthorizedException('Please sign in');

    const payload = await this.auth.verifyToken(token);
    const user = payload ? await this.auth.loadSessionUser(payload.sub) : null;
    if (!user) {
      response.clearCookie(this.auth.cookieName, this.auth.clearCookieOptions());
      throw new UnauthorizedException('Your session has expired. Please sign in again.');
    }

    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (roles && roles.length > 0 && !roles.includes(user.role)) {
      throw new ForbiddenException('You do not have access to this resource');
    }

    request.user = user;
    return true;
  }
}
