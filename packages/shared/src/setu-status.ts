/**
 * Canonical Setu eSign status vocabulary, shared by the api (classification /
 * persistence) and the web app (badge labels / polling stop-condition).
 *
 * Verified against docs.setu.co/data/esign/quickstart:
 *   request-level flow: sign_initiated -> sign_pending -> sign_in_progress -> sign_complete
 *   signer-level flow:  pending -> in_progress -> signed
 * Setu surfaces failures via a signer `errCode`, not a distinct request status,
 * so `sign_complete` is the only terminal request status Setu actually returns.
 */

export const SETU_SIGNATURE_STATUSES = [
  'sign_initiated',
  'sign_pending',
  'sign_in_progress',
  'sign_complete',
] as const;

export type SetuSignatureStatus = (typeof SETU_SIGNATURE_STATUSES)[number];

export const SIGNER_STATUSES = ['pending', 'in_progress', 'signed'] as const;
export type SignerStatus = (typeof SIGNER_STATUSES)[number];

/** Statuses at which no further Setu progression is expected. */
export const TERMINAL_SIGNATURE_STATUSES: readonly SetuSignatureStatus[] = ['sign_complete'];

export function isKnownSignatureStatus(value: string): value is SetuSignatureStatus {
  return (SETU_SIGNATURE_STATUSES as readonly string[]).includes(value);
}

export function isTerminalStatus(value: string): boolean {
  return (TERMINAL_SIGNATURE_STATUSES as readonly string[]).includes(value);
}

export function isComplete(value: string): boolean {
  return value === 'sign_complete';
}

export interface SetuStatusClassification {
  /** The status normalized to a known value, or 'unknown' for anything unexpected. */
  normalized: SetuSignatureStatus | 'unknown';
  /** Whether polling / reconciliation should stop. */
  terminal: boolean;
  /** Whether the signed document is now available for download. */
  complete: boolean;
}

/**
 * Pure classification shared by the status-refresh path and the webhook path so
 * both converge on the same terminal/complete decision.
 */
export function classifySetuStatus(value: string): SetuStatusClassification {
  const normalized = isKnownSignatureStatus(value) ? value : 'unknown';
  return {
    normalized,
    terminal: isTerminalStatus(value),
    complete: isComplete(value),
  };
}

export const SIGNATURE_STATUS_LABELS: Record<SetuSignatureStatus, string> = {
  sign_initiated: 'Initiated',
  sign_pending: 'Awaiting signature',
  sign_in_progress: 'Signing in progress',
  sign_complete: 'Signed',
};

export const SIGNER_STATUS_LABELS: Record<SignerStatus, string> = {
  pending: 'Pending',
  in_progress: 'In progress',
  signed: 'Signed',
};
