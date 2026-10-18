import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';
import {
  DatabaseFunctionMissingException,
  DatabaseUnavailableException,
  translateDatabaseError,
} from './database-errors.js';

const pgError = (code: string) => Object.assign(new Error(`raw ${code} detail`), { code });
const failed = (sql: string, code: string) => new QueryFailedError(sql, [], pgError(code));
const logger = new Logger('test');

describe('translateDatabaseError', () => {
  beforeEach(() => vi.spyOn(logger, 'error').mockReset().mockImplementation(() => undefined));
  const lastLog = () => String(vi.mocked(logger.error).mock.lastCall?.[0]);

  it('maps a missing function (42883) to a safe 503 without leaking details', () => {
    const error = translateDatabaseError(failed('SELECT * FROM sp_get_dashboard_stats($1)', '42883'), logger);
    expect(error).toBeInstanceOf(DatabaseFunctionMissingException);
    expect(JSON.stringify(error?.getResponse())).not.toContain('raw');
    expect(lastLog()).toContain('001_app_support_functions.sql');
  });

  it('maps the sp_user_login type mismatch, other query failures and connection errors to 503', () => {
    expect(translateDatabaseError(failed('SELECT * FROM sp_user_login($1, $2)', '42804'), logger)).toBeInstanceOf(
      DatabaseUnavailableException,
    );
    expect(lastLog()).toContain('FIX A');
    expect(translateDatabaseError(failed('SELECT sp_insert_user($1)', '23505'), logger)).toBeInstanceOf(
      DatabaseUnavailableException,
    );
    expect(translateDatabaseError(pgError('ECONNREFUSED'), logger)).toBeInstanceOf(DatabaseUnavailableException);
  });

  it('leaves non-database errors alone', () => {
    expect(translateDatabaseError(new Error('boom'), logger)).toBeNull();
  });
});

/** Every SQL statement in src/ is a parameterised function call, never table-level CRUD. */
describe('SQL in services', () => {
  const root = join(import.meta.dirname, '..');
  const files = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
      e.isDirectory() ? files(join(dir, e.name)) : e.name.endsWith('.ts') && !e.name.endsWith('.spec.ts') ? [join(dir, e.name)] : [],
    );
  const statements = files(root).flatMap((file) =>
    [...readFileSync(file, 'utf8').matchAll(/`\s*(SELECT\b[^`]*?);?\s*`/g)].map((m) => ({ file, sql: m[1].replace(/\s+/g, ' ') })),
  );

  it('finds the service queries', () => {
    expect(statements.length).toBeGreaterThanOrEqual(12);
  });

  it.each(statements)('$sql', ({ sql }) => {
    expect(sql).toMatch(/^SELECT (\* FROM )?sp_\w+\(/);
    expect(sql).not.toMatch(/\b(INSERT|UPDATE|DELETE)\b|"T_/i);
    expect(sql).not.toMatch(/\$\{/); // values are always $n parameters, never interpolated
  });
});
