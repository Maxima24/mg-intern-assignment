import { ApiProperty } from '@nestjs/swagger';

/** Swagger documentation model for the Setu webhook payload (validated manually). */
export class SetuWebhookDto {
  @ApiProperty({ type: String, example: 'ESIGN_WEBHOOK_NOTIFICATION' })
  event!: string;

  @ApiProperty({ type: String, example: '2026-07-06T12:00:00.000Z' })
  timeStamp!: string;

  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    example: { esign: { id: 'sig_123', documentId: 'doc_123', status: 'sign_complete', signers: [] } },
  })
  data!: Record<string, unknown>;
}

/** Runtime shape we actually read from the webhook body. */
export interface SetuWebhookPayload {
  event: string;
  timeStamp?: string;
  data?: {
    esign?: {
      id?: string;
      documentId?: string;
      status?: string;
      signers?: Array<{
        status?: string;
        url?: string;
        signatureDetails?: Record<string, unknown> | null;
        errCode?: string | null;
      }>;
    };
  };
}
