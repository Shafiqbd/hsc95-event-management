import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { QueryFailedError, type DataSource } from 'typeorm';
import { FakeDataSource, sessionRow, testConfig } from '../../test/helpers.js';
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
  const db = new FakeDataSource();
  const config = testConfig();
  const auth = new AuthService(db as unknown as DataSource, new JwtService({ secret: config.auth.secret }), config);
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
    db.on('sp_staff_login', () => [loginRow()]).on('sp_get_session_user', () => [sessionRow({ UserTypeName: typeName })]);
    await expect(auth.login('u', 'p')).resolves.toMatchObject({ role });
  });

  it('validates with sp_staff_login and checks status with sp_get_session_user', async () => {
    const { db, auth } = setup();
    db.on('sp_staff_login', () => [loginRow()]).on('sp_get_session_user', () => [sessionRow()]);
    const user = await auth.login('desk1', 'secret123');
    expect(db.calls[0]).toEqual({ name: 'sp_staff_login', params: ['desk1', 'secret123'] });
    expect(user).not.toHaveProperty('Password');
  });

  it('rejects invalid credentials with 401', async () => {
    const { db, auth } = setup();
    db.on('sp_staff_login', () => []);
    await expect(auth.login('x', 'y')).rejects.toBeInstanceOf(UnauthorizedException);
    expect(db.called('sp_get_session_user')).toBe(false);
  });

  it('refuses inactive users (UserStatus <> 1), which sp_staff_login does not check', async () => {
    const { db, auth } = setup();
    db.on('sp_staff_login', () => [loginRow()]).on('sp_get_session_user', () => [sessionRow({ UserStatus: '0' })]);
    await expect(auth.login('u', 'p')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('refuses user types that are not mapped to a role', async () => {
    const { db, auth } = setup();
    db.on('sp_staff_login', () => [loginRow()]).on('sp_get_session_user', () => [sessionRow({ UserTypeName: 'Guest' })]);
    await expect(auth.login('u', 'p')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lets a database failure propagate (the exception filter turns it into a 503)', async () => {
    const { db, auth } = setup();
    const failure = new QueryFailedError('SELECT * FROM sp_get_session_user($1)', [7], Object.assign(new Error('x'), { code: '42883' }));
    db.on('sp_staff_login', () => [loginRow()]).on('sp_get_session_user', () => {
      throw failure;
    });
    await expect(auth.login('u', 'p')).rejects.toBe(failure);
  });

  it('issues and verifies tokens that only carry the user id', async () => {
    const { auth } = setup();
    const token = await auth.issueToken({ userId: 7 } as never);
    await expect(auth.verifyToken(token)).resolves.toMatchObject({ sub: 7 });
    await expect(auth.verifyToken(token + 'x')).resolves.toBeNull();
  });
});
