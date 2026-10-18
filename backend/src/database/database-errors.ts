import { HttpException, HttpStatus, type Logger } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

/** PostgreSQL SQLSTATE codes we react to explicitly. */
export const PgCode = {
  undefinedFunction: '42883',
  datatypeMismatch: '42804',
} as const;

/**
 * Raised when a required database function is not installed. The message
 * shown to clients is generic; the function name is only logged.
 */
export class DatabaseFunctionMissingException extends HttpException {
  constructor(public readonly functionName: string) {
    super(
      { statusCode: 503, error: 'FeatureUnavailable', message: 'This feature is not available yet. Please contact the organiser.' },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

/** Database unreachable or the function failed in an unexpected way. */
export class DatabaseUnavailableException extends HttpException {
  constructor() {
    super(
      { statusCode: 503, error: 'ServiceUnavailable', message: 'The service is temporarily unavailable. Please try again later.' },
      HttpStatus.SERVICE_UNAVAILABLE,
    );
  }
}

export function pgErrorCode(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const code = (error as { code: unknown }).code;
    return typeof code === 'string' ? code : undefined;
  }
  return undefined;
}

/** Function names from db.txt; everything else comes from migration 001. */
const DB_TXT_FUNCTIONS = new Set([
  'sp_user_login',
  'sp_insert_user',
  'sp_get_user_list',
  'sp_insert_event_form',
  'sp_insert_event_form_photo',
  'sp_prepare_entrypass',
]);

/** Network-level failures reaching PostgreSQL (no SQLSTATE). */
const CONNECTION_CODES = new Set(['ECONNREFUSED', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EHOSTUNREACH', '57P01']);

/**
 * Map a database failure (TypeORM QueryFailedError or a connection error)
 * to a safe 503, logging the real cause with a hint. Returns null for
 * anything that is not a database error.
 */
export function translateDatabaseError(error: unknown, logger: Logger): HttpException | null {
  const queryFailed = error instanceof QueryFailedError;
  const code = pgErrorCode(queryFailed ? error.driverError : error);
  if (!queryFailed && !(code && CONNECTION_CODES.has(code))) return null;

  const fn = queryFailed ? (/\b(sp_\w+)\s*\(/i.exec(error.query)?.[1]?.toLowerCase() ?? 'query') : 'connection';
  const detail = error instanceof Error ? error.message : String(error);

  if (code === PgCode.undefinedFunction) {
    const hint = DB_TXT_FUNCTIONS.has(fn)
      ? 'Install the functions from db.txt (and pgcrypto for crypt()).'
      : 'Apply database/migrations/001_app_support_functions.sql.';
    logger.error(`Database function ${fn} (or something it calls) is missing: ${detail}. ${hint}`);
    return new DatabaseFunctionMissingException(fn);
  }
  if (code === PgCode.datatypeMismatch && fn === 'sp_user_login') {
    logger.error(
      'sp_user_login failed with a result type mismatch (ContactNumber numeric vs varchar). ' +
        'Apply FIX A from database/proposed/002_fix_existing_functions.sql.',
    );
    return new DatabaseUnavailableException();
  }
  logger.error(`Database call ${fn} failed [${code ?? 'no code'}]: ${detail}`);
  return new DatabaseUnavailableException();
}
