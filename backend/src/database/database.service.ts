import { HttpException, Inject, Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import pg from 'pg';
import { APP_CONFIG, type AppConfig } from '../config/app-config.js';
import {
  DatabaseFunctionMissingException,
  DatabaseUnavailableException,
  PgCode,
  pgErrorCode,
} from './database-errors.js';
import { buildDbFunctions, type DbFunction, type DbFunctions } from './db-functions.js';

// Keep timestamp-without-time-zone as the literal database string so the
// server's local time zone never shifts EntryDate.
pg.types.setTypeParser(pg.types.builtins.TIMESTAMP, (value) => value);

export type Queryable = Pick<pg.PoolClient, 'query'>;

export const PG_POOL = Symbol('PG_POOL');

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  readonly fn: DbFunctions;

  constructor(
    @Inject(PG_POOL) private readonly pool: pg.Pool,
    @Inject(APP_CONFIG) config: AppConfig,
  ) {
    this.fn = buildDbFunctions(config.db.schema);
  }

  /** Call a database function and return all rows. */
  async call<T extends object>(
    dbFn: DbFunction,
    params: readonly unknown[] = [],
    client: Queryable = this.pool,
  ): Promise<T[]> {
    try {
      const result = await client.query<T>(dbFn.sql, params as unknown[]);
      return result.rows;
    } catch (error) {
      throw this.translate(dbFn, error);
    }
  }

  /** Call a database function and return the first row, or null. */
  async callOne<T extends object>(
    dbFn: DbFunction,
    params: readonly unknown[] = [],
    client?: Queryable,
  ): Promise<T | null> {
    const rows = await this.call<T>(dbFn, params, client);
    return rows[0] ?? null;
  }

  /**
   * Run several function calls atomically. Any thrown error rolls back
   * everything, so no orphaned users/registrations are left behind.
   */
  async transaction<T>(work: (client: Queryable) => Promise<T>): Promise<T> {
    let client: pg.PoolClient;
    try {
      client = await this.pool.connect();
    } catch (error) {
      this.logger.error(`Could not obtain a database connection: ${describe(error)}`);
      throw new DatabaseUnavailableException();
    }
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  /** Map a raw driver error to a safe HTTP exception. Raw details are only logged. */
  private translate(dbFn: DbFunction, error: unknown): HttpException {
    const code = pgErrorCode(error);
    if (code === PgCode.undefinedFunction) {
      const hint =
        dbFn.source === '001'
          ? 'Apply database/migrations/001_app_support_functions.sql.'
          : 'Install the functions from db.txt.';
      this.logger.error(`Database function ${dbFn.name} is missing. ${hint}`);
      return new DatabaseFunctionMissingException(dbFn.name);
    }
    if (code === PgCode.datatypeMismatch && dbFn.name.endsWith('sp_user_login')) {
      this.logger.error(
        `${dbFn.name} failed with a result type mismatch (ContactNumber numeric vs varchar). ` +
          'Apply FIX A from database/proposed/002_fix_existing_functions.sql.',
      );
      return new DatabaseUnavailableException();
    }
    this.logger.error(`Database call ${dbFn.name} failed [${code ?? 'no code'}]: ${describe(error)}`);
    return new DatabaseUnavailableException();
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
