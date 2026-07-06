import { deriveFromSetu } from './setu.mapper';
import type { SetuSignature } from './setu.types';

const baseSig: SetuSignature = {
  id: 'sig_1',
  documentId: 'doc_1',
  redirectUrl: 'http://localhost:3000/signing-complete',
  status: 'sign_pending',
  signers: [
    {
      id: 'signer_1',
      identifier: 'a@b.com',
      displayName: 'Aarav',
      status: 'pending',
      url: 'https://sign.example/abc',
      signatureDetails: null,
      errCode: null,
    },
  ],
};

describe('deriveFromSetu', () => {
  it('extracts the persisted fields from a Setu signature', () => {
    const d = deriveFromSetu(baseSig);
    expect(d.status).toBe('sign_pending');
    expect(d.signerStatus).toBe('pending');
    expect(d.signerUrl).toBe('https://sign.example/abc');
    expect(d.signatureDetails).toBeNull();
    expect(d.rawSetu).toBe(baseSig);
  });

  it('carries signatureDetails through once signed', () => {
    const signed: SetuSignature = {
      ...baseSig,
      status: 'sign_complete',
      signers: [
        {
          ...baseSig.signers[0],
          status: 'signed',
          signatureDetails: { aadhaarName: 'AARAV', aadhaarSuffix: '1234' },
        },
      ],
    };
    const d = deriveFromSetu(signed);
    expect(d.status).toBe('sign_complete');
    expect(d.signerStatus).toBe('signed');
    expect(d.signatureDetails).toEqual({ aadhaarName: 'AARAV', aadhaarSuffix: '1234' });
  });

  it('is resilient to a missing signer array', () => {
    const empty = { ...baseSig, signers: [] };
    const d = deriveFromSetu(empty);
    expect(d.signerStatus).toBe('pending');
    expect(d.signerUrl).toBe('');
  });
});
