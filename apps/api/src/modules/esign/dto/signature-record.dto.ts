import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SETU_SIGNATURE_STATUSES,
  SIGNER_STATUSES,
  type SetuSignatureStatus,
  type SignerStatus,
} from '@mango/shared';

/** Aadhaar-derived details, populated once the signer completes. */
export class SignatureDetailsDto {
  @ApiPropertyOptional({ type: String, example: 'AARAV SHARMA' })
  aadhaarName?: string;

  @ApiPropertyOptional({ type: String, example: '4821' })
  aadhaarSuffix?: string;

  @ApiPropertyOptional({ type: String, example: '1994' })
  birthYear?: string;

  @ApiPropertyOptional({ type: String, example: 'M' })
  gender?: string;

  @ApiPropertyOptional({ type: String, example: '560001' })
  postalCode?: string;
}

/** The one record shape every eSign endpoint returns to the web app. */
export class SignatureRecordDto {
  @ApiProperty({ type: String, example: 'req_9f3k2m8q4x7c' })
  id!: string;

  @ApiProperty({ type: String, example: 'doc_1a2b3c4d5e6f' })
  documentId!: string;

  @ApiProperty({ type: String, example: 'sig_1a2b3c4d5e6f' })
  signatureId!: string;

  @ApiProperty({ type: String, example: 'nda-acme.pdf' })
  fileName!: string;

  @ApiProperty({ type: String, nullable: true, example: 'Mutual NDA — Acme Corp' })
  documentName!: string | null;

  @ApiProperty({ type: String, example: 'Aarav Sharma' })
  signerName!: string;

  @ApiProperty({ type: String, example: 'aarav@example.com' })
  signerIdentifier!: string;

  @ApiProperty({ enum: SETU_SIGNATURE_STATUSES, example: 'sign_pending' })
  status!: SetuSignatureStatus;

  @ApiProperty({ enum: SIGNER_STATUSES, example: 'pending' })
  signerStatus!: SignerStatus;

  @ApiProperty({ type: String, description: 'Hosted Setu signing URL' })
  signerUrl!: string;

  @ApiProperty({ type: () => SignatureDetailsDto, nullable: true })
  signatureDetails!: SignatureDetailsDto | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: string;
}
