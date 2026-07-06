import { Injectable } from '@nestjs/common';
import { Prisma, type SignatureRequest } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * The ONLY place Prisma is touched for signature requests. The service depends on
 * this port, never on PrismaService directly — which keeps persistence details out
 * of the orchestration layer and makes the service trivially mockable in tests.
 */

export interface CreateSignatureRequestData {
  id: string;
  documentId: string;
  signatureId: string;
  fileName: string;
  documentName: string | null;
  signerName: string;
  signerIdentifier: string;
  birthYear: string | null;
  status: string;
  signerStatus: string;
  signerUrl: string;
  originalStorageKey: string | null;
  signatureDetails: unknown;
  rawSetu: unknown;
}

export interface UpdateFromSetuData {
  status: string;
  signerStatus: string;
  signerUrl?: string;
  signatureDetails?: unknown;
  rawSetu?: unknown;
}

// Prisma requires a sentinel (not plain `null`) to write JSON null into a nullable column.
const toJson = (value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull =>
  value === null || value === undefined
    ? Prisma.JsonNull
    : (value as Prisma.InputJsonValue);

@Injectable()
export class EsignRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateSignatureRequestData): Promise<SignatureRequest> {
    return this.prisma.signatureRequest.create({
      data: {
        id: data.id,
        documentId: data.documentId,
        signatureId: data.signatureId,
        fileName: data.fileName,
        documentName: data.documentName,
        signerName: data.signerName,
        signerIdentifier: data.signerIdentifier,
        birthYear: data.birthYear,
        status: data.status,
        signerStatus: data.signerStatus,
        signerUrl: data.signerUrl,
        originalStorageKey: data.originalStorageKey,
        signatureDetails: toJson(data.signatureDetails),
        rawSetu: toJson(data.rawSetu),
      },
    });
  }

  setSignedStorageKey(id: string, key: string): Promise<SignatureRequest> {
    return this.prisma.signatureRequest.update({
      where: { id },
      data: { signedStorageKey: key },
    });
  }

  /** Look up by our primary key OR the Setu signatureId (either is accepted publicly). */
  findByAnyId(id: string): Promise<SignatureRequest | null> {
    return this.prisma.signatureRequest.findFirst({
      where: { OR: [{ id }, { signatureId: id }] },
    });
  }

  findBySignatureId(signatureId: string): Promise<SignatureRequest | null> {
    return this.prisma.signatureRequest.findUnique({ where: { signatureId } });
  }

  updateFromSetu(id: string, patch: UpdateFromSetuData): Promise<SignatureRequest> {
    return this.prisma.signatureRequest.update({
      where: { id },
      data: {
        status: patch.status,
        signerStatus: patch.signerStatus,
        ...(patch.signerUrl ? { signerUrl: patch.signerUrl } : {}),
        ...(patch.signatureDetails !== undefined
          ? { signatureDetails: toJson(patch.signatureDetails) }
          : {}),
        ...(patch.rawSetu !== undefined ? { rawSetu: toJson(patch.rawSetu) } : {}),
      },
    });
  }

  listRecent(limit = 20): Promise<SignatureRequest[]> {
    return this.prisma.signatureRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
