import pg from 'pg';
import type { DataSourceOptions } from 'typeorm';
import type { AppConfig } from '../config/app-config.js';

// Keep timestamp-without-time-zone as the literal database string so the
// server's local time zone never shifts EntryDate.
pg.types.setTypeParser(pg.types.builtins.TIMESTAMP, (value) => value);

export type PostgresOptions = Extract<DataSourceOptions, { type: 'postgres' }>;

/**
 * TypeORM connection settings, shared by the Nest app and the CLI. There are
 * no entities: services call the PostgreSQL functions with
 * dataSource.query('SELECT * FROM sp_...($1)'). search_path puts the app
 * schema first (so functions need no prefix) and keeps public for
 * pgcrypto's crypt().
 */
export function buildDataSourceOptions(config: AppConfig): PostgresOptions {
  return {
    type: 'postgres',
    host: config.db.host,
    port: config.db.port,
    database: config.db.database,
    username: config.db.user,
    password: config.db.password,
    ssl: config.db.ssl ? { rejectUnauthorized: true } : false,
    poolSize: config.db.poolMax,
    connectTimeoutMS: 5_000,
    applicationName: 'hsc95-event-management',
    entities: [],
    synchronize: false,
    migrationsRun: false,
    extra: {
      idleTimeoutMillis: 30_000,
      options: `-c search_path=${config.db.schema},public`,
    },
  };
}
