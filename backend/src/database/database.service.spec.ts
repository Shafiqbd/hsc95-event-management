import type pg from 'pg';
import { testConfig } from '../../test/helpers.js';
import { DatabaseFunctionMissingException, DatabaseUnavailableException } from './database-errors.js';
import { DatabaseService } from './database.service.js';

const pgError = (code: string) => Object.assign(new Error(`raw ${code} detail`), { code });

function serviceWith(query: (sql: string, params: unknown[]) => unknown) {
  const pool = { query: vi.fn(query), connect: vi.fn(), end: vi.fn() };
  return { pool, db: new DatabaseService(pool as unknown as pg.Pool, testConfig()) };
}

describe('DatabaseService', () => {
  it('only issues parameterised function calls', async () => {
    const { pool, db } = serviceWith(async () => ({ rows: [{ UserId: 1 }] }));
    await db.call(db.fn.userLogin, ["admin' OR 1=1 --", 'pw']);
    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toBe('SELECT * FROM hsc95.sp_user_login($1::varchar, $2::varchar)');
    expect(params).toEqual(["admin' OR 1=1 --", 'pw']);
  });

  it('every configured statement is a function call, never table-level CRUD', () => {
    const { db } = serviceWith(async () => ({ rows: [] }));
    for (const fn of Object.values(db.fn)) {
      expect(fn.sql).toMatch(/^SELECT (\* FROM )?hsc95\.sp_\w+\(/);
      expect(fn.sql).not.toMatch(/\b(INSERT|UPDATE|DELETE)\b|"T_/i);
    }
  });

  it('maps a missing function (42883) to a safe 503 without leaking details', async () => {
    const { db } = serviceWith(async () => {
      throw pgError('42883');
    });
    const error = await db.call(db.fn.getDashboardStats).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DatabaseFunctionMissingException);
    expect(JSON.stringify((error as DatabaseFunctionMissingException).getResponse())).not.toContain('raw');
  });

  it('maps the sp_user_login type mismatch and other failures to 503', async () => {
    const { db } = serviceWith(async () => {
      throw pgError('42804');
    });
    await expect(db.call(db.fn.userLogin, ['a', 'b'])).rejects.toBeInstanceOf(DatabaseUnavailableException);
  });

  it('rolls back a failed transaction', async () => {
    const client = { query: vi.fn(async (_sql: string) => ({ rows: [] })), release: vi.fn() };
    const { pool, db } = serviceWith(async () => ({ rows: [] }));
    pool.connect.mockResolvedValue(client);
    await expect(
      db.transaction(async () => {
        throw new Error('fail');
      }),
    ).rejects.toThrow('fail');
    expect(client.query.mock.calls.map((c) => c[0])).toEqual(['BEGIN', 'ROLLBACK']);
    expect(client.release).toHaveBeenCalled();
  });
});
