import { HttpException, HttpStatus } from '@nestjs/common';

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
