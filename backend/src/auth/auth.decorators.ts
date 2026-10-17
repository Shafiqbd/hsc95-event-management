import { createParamDecorator, ExecutionContext, SetMetadata, UseGuards, applyDecorators } from '@nestjs/common';
import type { Request } from 'express';
import { ROLES_KEY, type Role, type SessionUser } from './auth.types.js';
import { SessionGuard } from './session.guard.js';

/** Require an authenticated session; if roles are given, require one of them. */
export const Authenticated = (...roles: Role[]) =>
  applyDecorators(SetMetadata(ROLES_KEY, roles), UseGuards(SessionGuard));

/** The SessionUser resolved by SessionGuard. Never taken from the request body. */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): SessionUser => {
  const request = context.switchToHttp().getRequest<Request>();
  if (!request.user) throw new Error('CurrentUser used on a route without @Authenticated()');
  return request.user;
});
