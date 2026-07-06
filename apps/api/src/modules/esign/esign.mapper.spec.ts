import type { SignatureRequest } from '@prisma/client';
import { toSignatureRecordDto } from './esign.mapper';

const entity: SignatureRequest = {
  id: 'req_1',
  documentId: 'doc_1',
  signatureId: 'sig_1',
  fileName: 'nda.pdf',
  documentName: 'NDA',
  signerName: 'Aarav',
  signerIdentifier: 'a@b.com',
  birthYear: '1994',
  status: 'sign_complete',
  signerStatus: 'signed',
  signerUrl: 'https://sign.example/abc',
  originalStorageKey: 'contracts/sig_1/original.pdf',
  signedStorageKey: 'contracts/sig_1/signed.pdf',
  signatureDetails: { aadhaarName: 'AARAV', aadhaarSuffix: '1234' },
  rawSetu: { id: 'sig_1' },
  createdAt: new Date('2026-07-06T10:00:00.000Z'),
  updatedAt: new Date('2026-07-06T10:05:00.000Z'),
};

describe('toSignatureRecordDto', () => {
  it('maps entity to the public DTO with ISO dates', () => {
    const dto = toSignatureRecordDto(entity);
    expect(dto.id).toBe('req_1');
    expect(dto.signatureId).toBe('sig_1');
    expect(dto.status).toBe('sign_complete');
    expect(dto.createdAt).toBe('2026-07-06T10:00:00.000Z');
    expect(dto.updatedAt).toBe('2026-07-06T10:05:00.000Z');
    expect(dto.signatureDetails).toEqual({ aadhaarName: 'AARAV', aadhaarSuffix: '1234' });
  });

  it('does not leak internal storage keys', () => {
    const dto = toSignatureRecordDto(entity);
    expect(dto).not.toHaveProperty('originalStorageKey');
    expect(dto).not.toHaveProperty('signedStorageKey');
    expect(dto).not.toHaveProperty('rawSetu');
  });

  it('handles a null signatureDetails', () => {
    const dto = toSignatureRecordDto({ ...entity, signatureDetails: null });
    expect(dto.signatureDetails).toBeNull();
  });
});
