import type { SignatureRequest } from '@prisma/client';
import type { SetuSignatureStatus, SignerStatus } from '@mango/shared';
import type { SignatureDetailsDto, SignatureRecordDto } from './dto/signature-record.dto';

/**
 * Maps a persisted SignatureRequest entity to the public API DTO. Keeps Prisma
 * types (and Date/Json shapes) from leaking into controllers or the wire contract.
 */
export function toSignatureRecordDto(entity: SignatureRequest): SignatureRecordDto {
  return {
    id: entity.id,
    documentId: entity.documentId,
    signatureId: entity.signatureId,
    fileName: entity.fileName,
    documentName: entity.documentName,
    signerName: entity.signerName,
    signerIdentifier: entity.signerIdentifier,
    status: entity.status as SetuSignatureStatus,
    signerStatus: entity.signerStatus as SignerStatus,
    signerUrl: entity.signerUrl,
    signatureDetails: (entity.signatureDetails as SignatureDetailsDto | null) ?? null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  };
}
