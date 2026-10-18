import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { translateDatabaseError } from '../database/database-errors.js';

export interface ApiErrorBody {
  error: {
    statusCode: number;
    message: string;
    details?: string[];
  };
}

/**
 * Every error leaves the API as { error: { statusCode, message, details? } }.
 * Unknown errors (including raw database errors) are logged and replaced
 * with a generic 500 so stack traces never reach the client.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(raw: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    // Database failures become a safe 503; the real cause is only logged.
    const exception = translateDatabaseError(raw, this.logger) ?? raw;

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      let message = exception.message;
      let details: string[] | undefined;

      if (typeof body === 'object' && body !== null && 'message' in body) {
        const raw = (body as { message: unknown }).message;
        if (Array.isArray(raw)) {
          details = raw.map(String);
          message = 'Validation failed';
        } else if (typeof raw === 'string') {
          message = raw;
        }
      }

      response.status(status).json({ error: { statusCode: status, message, details } } satisfies ApiErrorBody);
      return;
    }

    this.logger.error(exception instanceof Error ? (exception.stack ?? exception.message) : String(exception));
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      error: { statusCode: 500, message: 'An unexpected error occurred.' },
    } satisfies ApiErrorBody);
  }
}
