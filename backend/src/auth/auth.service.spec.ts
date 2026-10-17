import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { FakeDatabase, sessionRow, testConfig } from '../../test/helpers.js';
import { DatabaseFunctionMissingException } from '../database/database-errors.js';
import type { DatabaseService } from '../database/database.service.js';
import { AuthService } from './auth.service.js';

const loginRow = (over: Record<string, unknown> = {}) => ({
  UserId: 7,
  FullName: 'Test',
  LoginName: 'u',
  ContactNumber: null,
  EmailAddress: 'e',
  UserTypeName: 'Register',
  ...over,
});

function setup() {
  const db = new FakeDatabase();
  const config = testConfig();
  const auth = new AuthService(db as unknown as DatabaseService, new JwtService({ secret: config.auth.secret }), config);
  return { db, auth };
}

describe('AuthService', () => {
  it.each([
    ['Admin', 'admin'],
    ['Register', 'register'],
    ['Report Viewer', 'viewer'],
    ['report viewer', 'viewer'],
  ])('maps user type "%s" to role %s', async (typeName, role) => {
    const { db, auth } = setup();
    db.on('sp_user_login', () => [loginRow()]).on('sp_get_session_user', () => [sessionRow({ UserTypeName: typeName })]);
    await expect(auth.login('u', 'p')).resolves.toMatchObject({ role });
  });

  it('validates with sp_user_login and checks status with sp_get_session_user', async () => {
    const { db, auth } = setup();
    db.on('sp_user_login', () => [loginRow()]).on('sp_get_session_user', () => [sessionRow()]);
    const user = await auth.login('desk1', 'secret123');
    expect(db.calls[0]).toEqual({ name: 'hsc95.sp_user_login', params: ['desk1', 'secret123'] });
    expect(user).not.toHaveProperty('Password');
  });

  it('rejects invalid credentials with 401', async () => {
    const { db, auth } = setup();
    db.on('sp_user_login', () => []);
    await expect(auth.login('x', 'y')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.called('sp_get_session_user')).toBe(false);
  });

  it('refuses inactive users (UserStatus <> 1), which sp_user_login does not check', async () => {
    const { db, auth } = setup();
    db.on('sp_user_login', () => [loginRow()]).on('sp_get_session_user', () => [sessionRow({ UserStatus: '0' })]);
    await expect(auth.login('u', 'p')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses user types that are not mapped to a role', async () => {
    const { db, auth } = setup();
    db.on('sp_user_login', () => [loginRow()]).on('sp_get_session_user', () => [sessionRow({ UserTypeName: 'Guest' })]);
    await expect(auth.login('u', 'p')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('propagates a missing database function as 503', async () => {
    const { db, auth } = setup();
    db.on('sp_user_login', () => [loginRow()]).on('sp_get_session_user', () => {
      throw new DatabaseFunctionMissingException('hsc95.sp_get_session_user');
    });
    await expect(auth.login('u', 'p')).rejects.toMatchObject({ status: 503 });
  });

  it('issues and verifies tokens that only carry the user id', async () => {
    const { auth } = setup();
    const token = await auth.issueToken({ userId: 7 } as never);
    await expect(auth.verifyToken(token)).resolves.toMatchObject({ sub: 7 });
    await expect(auth.verifyToken(token + 'x')).resolves.toBeNull();
  });
});
