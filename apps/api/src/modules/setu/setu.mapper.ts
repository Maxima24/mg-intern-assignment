import type { SetuSignature, SetuSignatureDetails } from './setu.types';

/**
 * Maps a Setu signature (wire shape) down to the subset of fields we persist.
 * Shared by the create, status-refresh and webhook paths so all three write the
 * same derived state.
 */
export interface SetuDerivedFields {
  status: string;
  signerStatus: string;
  signerUrl: string;
  signatureDetails: SetuSignatureDetails | null;
  rawSetu: unknown;
}

export function deriveFromSetu(sig: SetuSignature): SetuDerivedFields {
  const signer = sig.signers[0];
  return {
    status: sig.status,
    signerStatus: signer?.status ?? 'pending',
    signerUrl: signer?.url ?? '',
    signatureDetails: signer?.signatureDetails ?? null,
    rawSetu: sig,
  };
}
