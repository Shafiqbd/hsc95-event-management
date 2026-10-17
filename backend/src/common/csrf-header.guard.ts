import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import type { Request } from 'express';

export const CSRF_HEADER = 'x-requested-with';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Cookie-authenticated APIs need CSRF protection. Besides SameSite cookies,
 * every state-changing request must carry a custom header. Browsers do not
 * let cross-site HTML forms set custom headers, and cross-origin fetch with
 * a custom header requires a CORS preflight that this API does not grant.
 */
@Injectable()
export class CsrfHeaderGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (SAFE_METHODS.has(request.method)) return true;
    if (request.headers[CSRF_HEADER]) return true;
    throw new ForbiddenException('Missing request header');
  }
}
