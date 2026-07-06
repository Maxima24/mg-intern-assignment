import { HttpException } from '@nestjs/common';

/**
 * Domain error carrying a stable SCREAMING_SNAKE `code` alongside the HTTP status.
 * The global exception filter serializes this to `{ error: { code, message, details? } }`.
 *
 * Throw it for expected, client-meaningful failures:
 *   throw new AppError(409, 'NOT_SIGNED', 'Document has not been signed yet');
 */
export class AppError extends HttpException {
  constructor(
    status: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super({ code, message, ...(details ? { details } : {}) }, status);
  }
}
