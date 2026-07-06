import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Swagger model for the standard error envelope emitted by AllExceptionsFilter. */
export class ErrorBodyDto {
  @ApiProperty({ example: 'NOT_FOUND', description: 'Stable SCREAMING_SNAKE error code' })
  code!: string;

  @ApiProperty({ example: 'Signature request not found' })
  message!: string;

  @ApiPropertyOptional({
    description: 'Optional structured detail (e.g. field validation errors)',
    type: 'object',
    additionalProperties: true,
  })
  details?: Record<string, unknown>;
}

export class ErrorResponseDto {
  @ApiProperty({ type: ErrorBodyDto })
  error!: ErrorBodyDto;
}
