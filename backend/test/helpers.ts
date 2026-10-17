import { loadConfig, type AppConfig } from '../src/config/app-config.js';
import { buildDbFunctions, type DbFunction } from '../src/database/db-functions.js';

export const TEST_ENV = {
  NODE_ENV: 'test',
  DB_HOST: 'localhost',
  DB_NAME: 'test',
  DB_USER: 'test',
  AUTH_SECRET: 'x'.repeat(48),
  ADMIN_USER_TYPE_NAMES: 'Admin',
  REGISTER_USER_TYPE_NAMES: 'Register',
  VIEWER_USER_TYPE_NAMES: 'Report Viewer',
  UPLOAD_DIR: './.test-storage',
};

export function testConfig(overrides: Record<string, string> = {}): AppConfig {
  return loadConfig({ ...TEST_ENV, ...overrides });
}

type Handler = (params: readonly unknown[]) => unknown[] | Promise<unknown[]>;

/**
 * In-memory stand-in for DatabaseService: each database function name maps
 * to a handler returning rows. Records every call for assertions.
 */
export class FakeDatabase {
  readonly fn = buildDbFunctions('hsc95');
  readonly calls: { name: string; params: readonly unknown[] }[] = [];
  private readonly handlers = new Map<string, Handler>();
  committed = 0;
  rolledBack = 0;

  on(name: string, handler: Handler): this {
    this.handlers.set(`hsc95.${name}`, handler);
    return this;
  }

  async call<T>(dbFn: DbFunction, params: readonly unknown[] = []): Promise<T[]> {
    this.calls.push({ name: dbFn.name, params });
    const handler = this.handlers.get(dbFn.name);
    if (!handler) throw new Error(`No fake for ${dbFn.name}`);
    return (await handler(params)) as T[];
  }

  async callOne<T>(dbFn: DbFunction, params: readonly unknown[] = []): Promise<T | null> {
    const rows = await this.call<T>(dbFn, params);
    return rows[0] ?? null;
  }

  async transaction<T>(work: (client: unknown) => Promise<T>): Promise<T> {
    try {
      const result = await work({});
      this.committed += 1;
      return result;
    } catch (error) {
      this.rolledBack += 1;
      throw error;
    }
  }

  called(name: string): boolean {
    return this.calls.some((c) => c.name === `hsc95.${name}`);
  }
}

export const sessionRow = (over: Partial<Record<string, unknown>> = {}) => ({
  UserId: 7,
  FullName: 'Desk Operator',
  LoginName: 'desk1',
  Email: 't@example.com',
  ContactNumber: '01711111111',
  UserTypeName: 'Register',
  UserStatus: '1',
  ...over,
});

export const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1]);
