import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

/**
 * Text fields of the multipart upload-contract request. The PDF itself is handled
 * out-of-band by Multer + ParseFilePipe (not part of this DTO).
 */
export class UploadContractDto {
  @ApiProperty({ type: String, example: 'Aarav Sharma' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  signerName!: string;

  @ApiProperty({
    type: String,
    example: 'aarav@example.com',
    description: 'Signer email address or phone number',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  signerIdentifier!: string;

  @ApiPropertyOptional({
    type: String,
    example: '1994',
    description: '4-digit birth year (optional, aids validation)',
  })
  @ValidateIf((o: UploadContractDto) => o.birthYear !== undefined && o.birthYear !== '')
  @Matches(/^\d{4}$/, { message: 'birthYear must be a 4-digit year' })
  birthYear?: string;

  @ApiPropertyOptional({ type: String, example: 'Mutual NDA — Acme Corp' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  documentName?: string;

  @ApiProperty({
    type: String,
    example: 'http://localhost:3000/signing-complete',
    description: 'Where Setu returns the signer after signing',
  })
  @IsUrl({ require_tld: false })
  redirectUrl!: string;
}
