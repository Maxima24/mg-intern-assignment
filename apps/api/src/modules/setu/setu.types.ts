import type { SetuSignatureStatus, SignerStatus } from '@mango/shared';

/**
 * Typed inputs/outputs for the Setu client. Callers (EsignService) never see raw
 * Setu wire JSON — only these shapes. This keeps wire-format knowledge inside the
 * client and makes stub vs live interchangeable.
 */

export interface SetuUploadInput {
  buffer: Buffer;
  filename: string;
  name: string;
}

export interface SetuUploadResult {
  documentId: string;
  name: string;
}

export interface SetuSignerInput {
  identifier: string;
  displayName: string;
  birthYear?: string | null;
}

export interface SetuCreateSignatureInput {
  documentId: string;
  redirectUrl: string;
  signers: SetuSignerInput[];
}

export interface SetuSignatureDetails {
  aadhaarName?: string;
  aadhaarSuffix?: string;
  birthYear?: string;
  gender?: string;
  postalCode?: string;
}

export interface SetuSigner {
  id: string;
  identifier: string;
  displayName: string;
  status: SignerStatus;
  url?: string;
  signatureDetails?: SetuSignatureDetails | null;
  errCode?: string | null;
}

export interface SetuSignature {
  id: string;
  documentId: string;
  redirectUrl: string;
  status: SetuSignatureStatus;
  signers: SetuSigner[];
}

export interface SetuDownloadInfo {
  id: string;
  downloadUrl: string;
  validUpto: string;
}

export interface SetuDocumentBytes {
  buffer: Buffer;
  contentType: string;
}
