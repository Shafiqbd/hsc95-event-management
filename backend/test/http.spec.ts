import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/configure-app.js';
import { DataSource } from 'typeorm';
import { FakeDataSource, JPEG, sessionRow, TEST_ENV } from './helpers.js';

/**
 * HTTP-level tests of the real Nest pipeline (guards, pipes, filters,
 * cookies) with the database replaced by an in-memory fake.
 */
describe('HTTP API', () => {
  let app: INestApplication;
  const db = new FakeDataSource();
  const users: Record<number, ReturnType<typeof sessionRow>> = {
    1: sessionRow({ UserId: 1, UserTypeName: 'Admin', LoginName: 'admin' }),
    2: sessionRow({ UserId: 2, UserTypeName: 'Register', LoginName: 'desk1' }),
    3: sessionRow({ UserId: 3, UserTypeName: 'Report Viewer', LoginName: 'viewer' }),
  };

  beforeAll(async () => {
    Object.assign(process.env, TEST_ENV);
    db.on('sp_staff_login', ([login, password]) => {
      const user = Object.values(users).find((u) => u.LoginName === login);
      return user && password === 'pw' ? [{ ...user, EmailAddress: user.Email }] : [];
    })
      .on('sp_get_session_user', ([id]) => (users[id as number] ? [users[id as number]] : []))
      .on('sp_get_registration_list', () => [])
      .on('sp_get_registration_by_id', () => [])
      .on('sp_get_dashboard_stats', () => [
        { TotalRegistrations: '0', ActiveRegistrations: '0', WithDriver: '0', TotalAmount: '0', WithPhoto: '0', TokensReady: '0', WithPassCode: '0', RegisteredToday: '0' },
      ])
      .on('sp_get_tshirt_summary', () => [])
      .on('sp_prepare_entrypass', () => [])
      .on('sp_get_entrypass_by_ids', () => [])
      .on('sp_get_user_list', () => [])
      .on('sp_check_login_exists', ([login]) => [{ Exists: login === 'admin' }])
      .on('sp_insert_user', () => [{ UserId: 50 }])
      .on('sp_check_registration_duplicate', () => [{ MobileNoExists: false, FormNoExists: false }])
      .on('sp_get_next_form_no', () => [{ FormNo: '1' }])
      .on('sp_insert_event_form', () => [{ EntryId: 9 }])
      .on('sp_insert_event_form_photo', () => [{ PhotoId: '1' }]);

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(DataSource)
      .useValue(db)
      .compile();
    app = moduleRef.createNestApplication();
    configureApp(app, { frontendUrl: 'http://localhost:3000' });
    await app.init();
  });

  afterAll(() => app.close());

  // One login per user: the login endpoint is rate-limited (10/min per IP).
  const cookies = new Map<string, string[]>();
  const cookieFor = async (loginName: string) => {
    const cached = cookies.get(loginName);
    if (cached) return cached;
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ loginName, password: 'pw' });
    expect(res.status).toBe(200);
    const cookie = res.headers['set-cookie'] as unknown as string[];
    cookies.set(loginName, cookie);
    return cookie;
  };

  const newUser = (role: string) => ({
    fullName: 'New Person',
    loginName: 'desk9',
    password: 'secret123',
    email: 'n@example.com',
    role,
  });

  it('sets an HttpOnly session cookie on login and never returns secrets', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .set('X-Requested-With', 'XMLHttpRequest')
      .send({ loginName: 'desk1', password: 'pw' });
    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('register');
    expect(String(res.headers['set-cookie'])).toMatch(/hsc95_session=.+HttpOnly/i);
    expect(JSON.stringify(res.body)).not.toMatch(/password/i);
  });

  it('rejects bad credentials with 401 and requests without the CSRF header with 403', async () => {
    const server = app.getHttpServer();
    const bad = await request(server).post('/api/auth/login').set('X-Requested-With', 'x').send({ loginName: 'admin', password: 'no' });
    expect(bad.status).toBe(401);
    const noHeader = await request(server).post('/api/auth/login').send({ loginName: 'admin', password: 'pw' });
    expect(noHeader.status).toBe(403);
  });

  it('read endpoints: 401 without session, allowed for every staff role', async () => {
    const server = app.getHttpServer();
    expect((await request(server).get('/api/admin/registrations')).status).toBe(401);
    for (const login of ['admin', 'desk1', 'viewer']) {
      const cookie = await cookieFor(login);
      expect((await request(server).get('/api/admin/registrations').set('Cookie', cookie)).status).toBe(200);
    }
  });

  it('only Admin and Register can enter registrations; EntryBy is the session user', async () => {
    const server = app.getHttpServer();
    const post = (cookie: string[]) =>
      request(server)
        .post('/api/registrations')
        .set('Cookie', cookie)
        .set('X-Requested-With', 'XMLHttpRequest')
        .field('memberName', 'রহিম উদ্দিন')
        .field('mobileNo', '01711111111')
        .field('tShirtSize', 'L')
        .field('includeDriver', 'false')
        .attach('photo', JPEG, { filename: 'p.jpg', contentType: 'image/jpeg' });

    expect((await post(await cookieFor('viewer'))).status).toBe(403);

    db.calls.length = 0;
    const res = await post(await cookieFor('desk1'));
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ entryId: 9, formNo: 1, amountPaid: 1500 });
    expect(db.calls.find((c) => c.name === 'sp_insert_event_form')?.params[11]).toBe(2);
  });

  it('only Admin can list and create users; duplicates are refused', async () => {
    const server = app.getHttpServer();
    const create = (cookie: string[], body: object) =>
      request(server).post('/api/admin/users').set('Cookie', cookie).set('X-Requested-With', 'x').send(body);

    const [register, viewer, admin] = [await cookieFor('desk1'), await cookieFor('viewer'), await cookieFor('admin')];
    expect((await request(server).get('/api/admin/users').set('Cookie', register)).status).toBe(403);
    expect((await create(viewer, newUser('register'))).status).toBe(403);

    db.calls.length = 0;
    const ok = await create(admin, newUser('viewer'));
    expect(ok.status).toBe(201);
    expect(ok.body.data).toEqual({ userId: 50 });
    // UserType id for "viewer" from config (default 3)
    expect(db.calls.find((c) => c.name === 'sp_insert_user')?.params[5]).toBe(3);

    expect((await create(admin, { ...newUser('admin'), loginName: 'admin' })).status).toBe(409);
    expect((await create(admin, { ...newUser('superuser') })).status).toBe(400);
    expect((await create(admin, { ...newUser('admin'), password: 'short' })).status).toBe(400);
  });

  it('Register users only read forms they entered; Admin and Report Viewer read all', async () => {
    const server = app.getHttpServer();
    const lastParams = (fn: string) => db.calls.filter((c) => c.name === fn).at(-1)?.params;

    for (const [login, scope] of [['desk1', 2], ['admin', null], ['viewer', null]] as const) {
      const cookie = await cookieFor(login);
      db.calls.length = 0;
      expect((await request(server).get('/api/admin/registrations?search=x').set('Cookie', cookie)).status).toBe(200);
      expect(lastParams('sp_get_registration_list')).toEqual(['x', 20, 0, scope]);
      expect((await request(server).get('/api/admin/stats').set('Cookie', cookie)).status).toBe(200);
      expect(lastParams('sp_get_dashboard_stats')).toEqual([scope]);
      expect(lastParams('sp_get_tshirt_summary')).toEqual([scope]);
      expect((await request(server).get('/api/admin/tokens/print-data?ids=1,2').set('Cookie', cookie)).status).toBe(200);
      expect(lastParams('sp_get_entrypass_by_ids')).toEqual([[1, 2], scope]);
    }

    // A form outside the Register user's scope looks like it does not exist.
    const desk = await cookieFor('desk1');
    db.calls.length = 0;
    expect((await request(server).get('/api/admin/registrations/5').set('Cookie', desk)).status).toBe(404);
    expect(lastParams('sp_get_registration_by_id')).toEqual([5, 2]);

    // "Print all": Register gets only their own eligible forms; others get every eligible form.
    db.calls.length = 0;
    await request(server).get('/api/admin/tokens/print-data').set('Cookie', desk);
    expect(lastParams('sp_get_entrypass_by_ids')).toEqual([null, 2]);
    db.calls.length = 0;
    await request(server).get('/api/admin/tokens/print-data').set('Cookie', await cookieFor('viewer'));
    expect(lastParams('sp_get_entrypass_by_ids')).toEqual([null, null]);
    expect(lastParams('sp_prepare_entrypass')).toBeUndefined();
  });

  it('rejects a forged session cookie', async () => {
    const res = await request(app.getHttpServer()).get('/api/auth/me').set('Cookie', 'hsc95_session=forged.token.value');
    expect(res.status).toBe(401);
  });
});
