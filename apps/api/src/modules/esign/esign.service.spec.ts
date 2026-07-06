import type { SignatureRequest } from '@prisma/client';
import { AppError } from '../../common/utils/app-error';
import { EsignService } from './esign.service';
import type { EsignRepository } from './esign.repository';
import type { SetuClient } from '../setu/setu.client';
import type { StorageService } from '../storage/storage.service';

const record = (over: Partial<SignatureRequest> = {}): SignatureRequest => ({
  id: 'req_1',
  documentId: 'doc_1',
  signatureId: 'sig_1',
  fileName: 'nda.pdf',
  documentName: 'NDA',
  signerName: 'Aarav',
  signerIdentifier: 'a@b.com',
  birthYear: null,
  status: 'sign_pending',
  signerStatus: 'pending',
  signerUrl: 'https://sign/abc',
  originalStorageKey: 'contracts/sig_1/original.pdf',
  signedStorageKey: null,
  signatureDetails: null,
  rawSetu: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

function make() {
  const setu = {
    uploadDocument: jest.fn(),
    createSignature: jest.fn(),
    getSignature: jest.fn(),
    getDownloadInfo: jest.fn(),
    fetchDocumentBytes: jest.fn(),
  } as unknown as jest.Mocked<SetuClient>;
  const repo = {
    create: jest.fn(),
    findByAnyId: jest.fn(),
    findBySignatureId: jest.fn(),
    updateFromSetu: jest.fn(),
    setSignedStorageKey: jest.fn(),
    listRecent: jest.fn(),
  } as unknown as jest.Mocked<EsignRepository>;
  const storage = {
    put: jest.fn(),
    get: jest.fn(),
  } as unknown as jest.Mocked<StorageService>;
  return { service: new EsignService(setu, repo, storage), setu, repo, storage };
}

const file = { buffer: Buffer.from('%PDF-1.4'), originalname: 'nda.pdf' } as Express.Multer.File;

describe('EsignService.uploadContract', () => {
  it('uploads to Setu, stores the original, and persists the record', async () => {
    const { service, setu, repo, storage } = make();
    setu.uploadDocument.mockResolvedValue({ documentId: 'doc_1', name: 'NDA' });
    setu.createSignature.mockResolvedValue({
      id: 'sig_1',
      documentId: 'doc_1',
      redirectUrl: 'http://x/y',
      status: 'sign_initiated',
      signers: [{ id: 's', identifier: 'a@b.com', displayName: 'Aarav', status: 'pending', url: 'https://sign/abc' }],
    });
    repo.create.mockResolvedValue(record({ status: 'sign_initiated' }));

    const dto = { signerName: 'Aarav', signerIdentifier: 'a@b.com', redirectUrl: 'http://x/y' };
    const result = await service.uploadContract(dto as never, file);

    expect(setu.uploadDocument).toHaveBeenCalled();
    expect(storage.put).toHaveBeenCalledWith(
      'contracts/sig_1/original.pdf',
      file.buffer,
      'application/pdf',
    );
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ signatureId: 'sig_1', documentId: 'doc_1' }),
    );
    expect(result.signatureId).toBe('sig_1');
  });

  it('still persists if storing the original fails (best-effort)', async () => {
    const { service, setu, repo, storage } = make();
    setu.uploadDocument.mockResolvedValue({ documentId: 'doc_1', name: 'NDA' });
    setu.createSignature.mockResolvedValue({
      id: 'sig_1',
      documentId: 'doc_1',
      redirectUrl: 'http://x/y',
      status: 'sign_initiated',
      signers: [{ id: 's', identifier: 'a@b.com', displayName: 'Aarav', status: 'pending' }],
    });
    storage.put.mockRejectedValue(new Error('R2 down'));
    repo.create.mockResolvedValue(record());

    await expect(service.uploadContract({ signerName: 'A', signerIdentifier: 'a@b.com', redirectUrl: 'http://x/y' } as never, file)).resolves.toBeDefined();
    expect(repo.create).toHaveBeenCalled();
  });
});

describe('EsignService.refreshStatus', () => {
  it('short-circuits without calling Setu when already terminal', async () => {
    const { service, setu, repo } = make();
    repo.findByAnyId.mockResolvedValue(record({ status: 'sign_complete' }));
    const dto = await service.refreshStatus('sig_1');
    expect(setu.getSignature).not.toHaveBeenCalled();
    expect(dto.status).toBe('sign_complete');
  });

  it('fetches + persists when non-terminal', async () => {
    const { service, setu, repo } = make();
    repo.findByAnyId.mockResolvedValue(record({ status: 'sign_pending' }));
    setu.getSignature.mockResolvedValue({
      id: 'sig_1',
      documentId: 'doc_1',
      redirectUrl: 'http://x/y',
      status: 'sign_complete',
      signers: [{ id: 's', identifier: 'a@b.com', displayName: 'Aarav', status: 'signed', signatureDetails: { aadhaarName: 'AARAV' } }],
    });
    repo.updateFromSetu.mockResolvedValue(record({ status: 'sign_complete' }));

    const dto = await service.refreshStatus('sig_1');
    expect(setu.getSignature).toHaveBeenCalledWith('sig_1');
    expect(repo.updateFromSetu).toHaveBeenCalled();
    expect(dto.status).toBe('sign_complete');
  });

  it('throws NOT_FOUND when the record does not exist', async () => {
    const { service, repo } = make();
    repo.findByAnyId.mockResolvedValue(null);
    await expect(service.refreshStatus('missing')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('EsignService.getDownloadStream', () => {
  it('rejects with 409 NOT_SIGNED before completion', async () => {
    const { service, repo } = make();
    repo.findByAnyId.mockResolvedValue(record({ status: 'sign_pending' }));
    await expect(service.getDownloadStream('sig_1')).rejects.toMatchObject({ code: 'NOT_SIGNED' });
  });

  it('serves from the R2 cache when present (no Setu call)', async () => {
    const { service, setu, repo, storage } = make();
    repo.findByAnyId.mockResolvedValue(record({ status: 'sign_complete', signedStorageKey: 'k' }));
    storage.get.mockResolvedValue({ buffer: Buffer.from('%PDF-cached'), contentType: 'application/pdf' });

    const res = await service.getDownloadStream('sig_1');
    expect(storage.get).toHaveBeenCalledWith('k');
    expect(setu.getDownloadInfo).not.toHaveBeenCalled();
    expect(res.filename).toMatch(/\.pdf$/);
  });

  it('fetches from Setu then caches when not cached', async () => {
    const { service, setu, repo, storage } = make();
    repo.findByAnyId.mockResolvedValue(record({ status: 'sign_complete', signedStorageKey: null }));
    setu.getDownloadInfo.mockResolvedValue({ id: 'sig_1', downloadUrl: 'stub://signed/sig_1', validUpto: 'x' });
    setu.fetchDocumentBytes.mockResolvedValue({ buffer: Buffer.from('%PDF-fresh'), contentType: 'application/pdf' });

    await service.getDownloadStream('sig_1');
    expect(setu.getDownloadInfo).toHaveBeenCalled();
    expect(storage.put).toHaveBeenCalledWith('contracts/sig_1/signed.pdf', expect.any(Buffer), 'application/pdf');
    expect(repo.setSignedStorageKey).toHaveBeenCalledWith('req_1', 'contracts/sig_1/signed.pdf');
  });
});
