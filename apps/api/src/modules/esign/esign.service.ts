import { Injectable, Logger } from '@nestjs/common';
import { isComplete, isTerminalStatus } from '@mango/shared';
import { AppError } from '../../common/utils/app-error';
import { ID_PREFIXES, newId } from '../../common/utils/ids';
import { SetuClient } from '../setu/setu.client';
import { deriveFromSetu } from '../setu/setu.mapper';
import type { SetuSignature } from '../setu/setu.types';
import { toSignatureRecordDto } from './esign.mapper';
import { EsignRepository } from './esign.repository';
import type { UploadContractDto } from './dto/upload-contract.dto';
import type { SignatureRecordDto } from './dto/signature-record.dto';
import type { SetuWebhookPayload } from './dto/setu-webhook.dto';

/**
 * Orchestration only. Talks to SetuClient (provider) and EsignRepository (data),
 * translating between them via mappers. Holds no Prisma or wire-format types.
 */
@Injectable()
export class EsignService {
  private readonly logger = new Logger(EsignService.name);

  constructor(
    private readonly setu: SetuClient,
    private readonly repo: EsignRepository,
  ) {}

  async uploadContract(
    dto: UploadContractDto,
    file: Express.Multer.File,
  ): Promise<SignatureRecordDto> {
    const documentName = dto.documentName?.trim() || file.originalname;

    const upload = await this.setu.uploadDocument({
      buffer: file.buffer,
      filename: file.originalname,
      name: documentName,
    });

    const sig = await this.setu.createSignature({
      documentId: upload.documentId,
      redirectUrl: dto.redirectUrl,
      signers: [
        {
          identifier: dto.signerIdentifier,
          displayName: dto.signerName,
          birthYear: dto.birthYear ?? null,
        },
      ],
    });

    const derived = deriveFromSetu(sig);
    const entity = await this.repo.create({
      id: newId(ID_PREFIXES.request),
      documentId: upload.documentId,
      signatureId: sig.id,
      fileName: file.originalname,
      documentName,
      signerName: dto.signerName,
      signerIdentifier: dto.signerIdentifier,
      birthYear: dto.birthYear ?? null,
      status: derived.status,
      signerStatus: derived.signerStatus,
      signerUrl: derived.signerUrl,
      signatureDetails: derived.signatureDetails,
      rawSetu: derived.rawSetu,
    });

    this.logger.log(`Created signature request ${entity.id} (${entity.signatureId})`);
    return toSignatureRecordDto(entity);
  }

  async refreshStatus(id: string): Promise<SignatureRecordDto> {
    const record = await this.repo.findByAnyId(id);
    if (!record) throw new AppError(404, 'NOT_FOUND', 'Signature request not found');

    // Once terminal, don't call Setu again (also prevents any regression).
    if (isTerminalStatus(record.status)) return toSignatureRecordDto(record);

    const sig = await this.setu.getSignature(record.signatureId);
    const derived = deriveFromSetu(sig);
    const updated = await this.repo.updateFromSetu(record.id, {
      status: derived.status,
      signerStatus: derived.signerStatus,
      signerUrl: derived.signerUrl || record.signerUrl,
      signatureDetails: derived.signatureDetails,
      rawSetu: derived.rawSetu,
    });
    return toSignatureRecordDto(updated);
  }

  async getDownloadStream(
    id: string,
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const record = await this.repo.findByAnyId(id);
    if (!record) throw new AppError(404, 'NOT_FOUND', 'Signature request not found');
    if (!isComplete(record.status)) {
      throw new AppError(409, 'NOT_SIGNED', 'Document has not been signed yet');
    }

    const info = await this.setu.getDownloadInfo(record.signatureId);
    const bytes = await this.setu.fetchDocumentBytes(info.downloadUrl);

    const base = (record.documentName || record.fileName).replace(/\.pdf$/i, '');
    const filename = `${base.replace(/[^a-z0-9-_ ]/gi, '_').trim() || 'document'}-signed.pdf`;
    return { buffer: bytes.buffer, filename, contentType: bytes.contentType };
  }

  async applyWebhook(payload: SetuWebhookPayload): Promise<void> {
    const esign = payload.data?.esign;
    if (!esign?.id) throw new AppError(400, 'VALIDATION_FAILED', 'Malformed webhook payload');

    const record = await this.repo.findBySignatureId(esign.id);
    if (!record) {
      this.logger.warn(`Webhook for unknown signature ${esign.id} — ignoring`);
      return;
    }

    // Adapt the webhook's esign object to the SetuSignature shape and reuse the mapper.
    const derived = deriveFromSetu(esign as unknown as SetuSignature);
    await this.repo.updateFromSetu(record.id, {
      status: derived.status || record.status,
      signerStatus: derived.signerStatus,
      signerUrl: derived.signerUrl || record.signerUrl,
      signatureDetails: derived.signatureDetails,
      rawSetu: esign,
    });
    this.logger.log(`Applied webhook for ${esign.id} -> ${derived.status}`);
  }
}
