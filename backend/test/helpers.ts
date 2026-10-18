import { loadConfig, type AppConfig } from '../src/config/app-config.js';

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
 * In-memory stand-in for the TypeORM DataSource: each database function name
 * (sp_...) maps to a handler returning rows. Records every call.
 */
export class FakeDataSource {
  readonly calls: { name: string; params: readonly unknown[] }[] = [];
  readonly sql: string[] = [];
  private readonly handlers = new Map<string, Handler>();
  committed = 0;
  rolledBack = 0;
  isInitialized = true;

  on(name: string, handler: Handler): this {
    this.handlers.set(name, handler);
    return this;
  }

  query = async (sql: string, params: readonly unknown[] = []): Promise<unknown[]> => {
    const name = /\b(sp_\w+)\s*\(/.exec(sql)?.[1];
    if (!name) throw new Error(`Not a database function call: ${sql}`);
    this.sql.push(sql);
    this.calls.push({ name, params });
    const handler = this.handlers.get(name);
    if (!handler) throw new Error(`No fake for ${name}`);
    return handler(params);
  };

  async transaction<T>(work: (manager: { query: FakeDataSource['query'] }) => Promise<T>): Promise<T> {
    try {
      const result = await work({ query: this.query });
      this.committed += 1;
      return result;
    } catch (error) {
      this.rolledBack += 1;
      throw error;
    }
  }

  async destroy(): Promise<void> {}

  called(name: string): boolean {
    return this.calls.some((c) => c.name === name);
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
