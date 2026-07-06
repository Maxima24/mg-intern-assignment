import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

/**
 * Global exception filter — every error leaves the API in one shape:
 *   { error: { code: "SCREAMING_SNAKE", message: string, details?: object } }
 *
 * - AppError / HttpException carrying a `code` pass through verbatim.
 * - Nest's ValidationPipe errors (message is a string[]) are remapped to
 *   VALIDATION_FAILED with the field messages under `details.errors`.
 * - Anything else becomes a generic 500 INTERNAL (logged with stack); we never
 *   leak upstream (e.g. Setu) internals to the client.
 */
const STATUS_TO_CODE: Record<number, string> = {
  400: 'VALIDATION_FAILED',
  401: 'AUTH_REQUIRED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'BUSINESS_RULE_VIOLATION',
  429: 'RATE_LIMITED',
  500: 'INTERNAL',
  502: 'PROVIDER_UNAVAILABLE',
  503: 'MAINTENANCE',
};

interface ErrorBody {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const { status, body } = this.normalize(exception);

    if (status >= 500) {
      this.logger.error(
        `${req.method} ${req.url} -> ${status} ${body.code}: ${body.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    res.status(status).json({ error: body });
  }

  private normalize(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const response = exception.getResponse();

      // AppError shape: { code, message, details? }
      if (typeof response === 'object' && response !== null && 'code' in response) {
        const r = response as Partial<ErrorBody>;
        return {
          status,
          body: {
            code: r.code ?? STATUS_TO_CODE[status] ?? 'ERROR',
            message: r.message ?? exception.message,
            ...(r.details ? { details: r.details } : {}),
          },
        };
      }

      // Nest built-in shape: { statusCode, message: string | string[], error }
      const code = STATUS_TO_CODE[status] ?? 'ERROR';
      if (typeof response === 'object' && response !== null && 'message' in response) {
        const raw = (response as { message: unknown }).message;
        if (Array.isArray(raw)) {
          return {
            status,
            body: { code, message: 'Request validation failed', details: { errors: raw } },
          };
        }
        return { status, body: { code, message: String(raw) } };
      }

      return { status, body: { code, message: exception.message } };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { code: 'INTERNAL', message: 'Internal server error' },
    };
  }
}
