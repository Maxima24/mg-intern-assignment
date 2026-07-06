import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SetuSignatureStatus, SignerStatus } from '@mango/shared';
import type { SetuConfig } from '../../config/configuration';
import { AppError } from '../../common/utils/app-error';
import { buildStubPdf } from './stub-pdf';
import type {
  SetuCreateSignatureInput,
  SetuDocumentBytes,
  SetuDownloadInfo,
  SetuSignature,
  SetuSignatureDetails,
  SetuUploadInput,
  SetuUploadResult,
} from './setu.types';

interface StubEntry {
  sig: SetuSignature;
  polls: number;
}

/**
 * The single seam to Setu's Aadhaar eSign API.
 *
 * `isStub()` (derived from SETU_PROVIDER / presence of creds) short-circuits every
 * method with deterministic fakes so the whole flow runs with zero credentials.
 * The live branch is raw REST (no official SDK) against SETU_BASE_URL with the three
 * static headers. Everything above this class is identical in stub and live modes.
 */
@Injectable()
export class SetuClient {
  private readonly logger = new Logger(SetuClient.name);

  /** In-memory stub state: advances signature status across status polls. */
  private readonly stub = new Map<string, StubEntry>();

  constructor(private readonly config: ConfigService) {}

  private get setu(): SetuConfig {
    return this.config.get<SetuConfig>('setu')!;
  }

  isStub(): boolean {
    return this.setu.provider !== 'live';
  }

  // ---------------------------------------------------------------------------
  // Public operations
  // ---------------------------------------------------------------------------

  async uploadDocument(input: SetuUploadInput): Promise<SetuUploadResult> {
    if (this.isStub()) {
      const documentId = this.stubId('doc', `${input.name}:${input.filename}`);
      this.logger.log(`[stub] uploadDocument -> ${documentId}`);
      return { documentId, name: input.name };
    }

    const form = new FormData();
    form.append('document', new Blob([input.buffer], { type: 'application/pdf' }), input.filename);
    form.append('name', input.name);

    const res = await this.request('/api/documents', { method: 'POST', body: form });
    const json = (await this.parse(res, 'uploadDocument')) as { id: string; name?: string };
    return { documentId: json.id, name: json.name ?? input.name };
  }

  async createSignature(input: SetuCreateSignatureInput): Promise<SetuSignature> {
    if (this.isStub()) {
      const signatureId = this.stubId('sig', input.documentId);
      const primary = input.signers[0];
      const sig: SetuSignature = {
        id: signatureId,
        documentId: input.documentId,
        redirectUrl: input.redirectUrl,
        status: 'sign_initiated',
        signers: [
          {
            id: this.stubId('signer', signatureId),
            identifier: primary?.identifier ?? 'unknown',
            displayName: primary?.displayName ?? 'Signer',
            status: 'pending',
            url: this.stubSignerUrl(signatureId, input.redirectUrl),
            signatureDetails: null,
            errCode: null,
          },
        ],
      };
      this.stub.set(signatureId, { sig, polls: 0 });
      this.logger.log(`[stub] createSignature -> ${signatureId}`);
      return sig;
    }

    const res = await this.request('/api/signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        documentId: input.documentId,
        redirectUrl: input.redirectUrl,
        signers: input.signers.map((s) => ({
          identifier: s.identifier,
          displayName: s.displayName,
          ...(s.birthYear ? { birthYear: s.birthYear } : {}),
        })),
      }),
    });
    return this.parse(res, 'createSignature') as Promise<SetuSignature>;
  }

  async getSignature(signatureId: string): Promise<SetuSignature> {
    if (this.isStub()) {
      return this.advanceStub(signatureId);
    }
    const res = await this.request(`/api/signature/${encodeURIComponent(signatureId)}`);
    return this.parse(res, 'getSignature') as Promise<SetuSignature>;
  }

  async getDownloadInfo(signatureId: string): Promise<SetuDownloadInfo> {
    if (this.isStub()) {
      return {
        id: signatureId,
        downloadUrl: `stub://signed/${signatureId}`,
        validUpto: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      };
    }
    const res = await this.request(`/api/signature/${encodeURIComponent(signatureId)}/download/`);
    return this.parse(res, 'getDownloadInfo') as Promise<SetuDownloadInfo>;
  }

  async fetchDocumentBytes(downloadUrl: string): Promise<SetuDocumentBytes> {
    if (downloadUrl.startsWith('stub://')) {
      const id = downloadUrl.replace('stub://signed/', '');
      const buffer = buildStubPdf([
        'Mango eSign — simulated signed document',
        '',
        `Signature request: ${id}`,
        'Status: sign_complete',
        '',
        'This PDF was produced by the stub Setu provider so the',
        'download flow works end-to-end without credentials.',
      ]);
      return { buffer, contentType: 'application/pdf' };
    }

    // Live: second-hop GET against the pre-signed S3 URL (no Setu headers).
    const res = await fetch(downloadUrl);
    if (!res.ok) {
      throw new AppError(502, 'PROVIDER_UNAVAILABLE', 'Failed to download signed document');
    }
    const arrayBuffer = await res.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      contentType: res.headers.get('content-type') ?? 'application/pdf',
    };
  }

  /**
   * HMAC-SHA256 verification of a raw webhook body. Stub mode bypasses (no secret
   * exchange happened). Returns false on any missing input.
   */
  verifyWebhookSignature(rawBody: string, signature?: string): boolean {
    if (this.isStub()) return true;
    const secret = this.setu.webhookSecret;
    if (!secret || !signature) return false;

    const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest('hex');
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(signature.trim().toLowerCase(), 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  // ---------------------------------------------------------------------------
  // Stub helpers
  // ---------------------------------------------------------------------------

  private advanceStub(signatureId: string): SetuSignature {
    const entry = this.stub.get(signatureId) ?? this.synthesizeStub(signatureId);
    entry.polls += 1;

    const completeAt = Math.max(1, this.setu.stubPollsToComplete);
    let status: SetuSignatureStatus;
    let signerStatus: SignerStatus;
    if (entry.polls >= completeAt) {
      status = 'sign_complete';
      signerStatus = 'signed';
    } else if (entry.polls >= completeAt - 1) {
      status = 'sign_in_progress';
      signerStatus = 'in_progress';
    } else {
      status = 'sign_pending';
      signerStatus = 'pending';
    }

    const signer = entry.sig.signers[0];
    signer.status = signerStatus;
    if (status === 'sign_complete') {
      signer.signatureDetails = this.stubDetails(signatureId, signer.displayName, signer.identifier);
    }
    entry.sig.status = status;
    this.stub.set(signatureId, entry);
    return entry.sig;
  }

  private synthesizeStub(signatureId: string): StubEntry {
    const sig: SetuSignature = {
      id: signatureId,
      documentId: this.stubId('doc', signatureId),
      redirectUrl: '',
      status: 'sign_initiated',
      signers: [
        {
          id: this.stubId('signer', signatureId),
          identifier: 'unknown',
          displayName: 'Signer',
          status: 'pending',
          signatureDetails: null,
          errCode: null,
        },
      ],
    };
    const entry = { sig, polls: 0 };
    this.stub.set(signatureId, entry);
    return entry;
  }

  private stubDetails(seed: string, displayName: string, identifier: string): SetuSignatureDetails {
    const suffix = (parseInt(createHash('sha1').update(seed).digest('hex').slice(0, 6), 16) % 10000)
      .toString()
      .padStart(4, '0');
    const name = /@/.test(displayName) ? identifier.split('@')[0] : displayName;
    return {
      aadhaarName: name.toUpperCase(),
      aadhaarSuffix: suffix,
      birthYear: '1990',
      gender: 'M',
      postalCode: '560001',
    };
  }

  private stubSignerUrl(signatureId: string, redirectUrl: string): string {
    try {
      const origin = new URL(redirectUrl).origin;
      return `${origin}/mock-sign/${signatureId}?redirect=${encodeURIComponent(redirectUrl)}`;
    } catch {
      return `/mock-sign/${signatureId}`;
    }
  }

  private stubId(prefix: string, seed: string): string {
    return `${prefix}_${createHash('sha1').update(seed).digest('hex').slice(0, 12)}`;
  }

  // ---------------------------------------------------------------------------
  // Live HTTP helpers
  // ---------------------------------------------------------------------------

  private headers(): Record<string, string> {
    const { clientId, clientSecret, productInstanceId } = this.setu;
    if (!clientId || !clientSecret || !productInstanceId) {
      throw new AppError(
        502,
        'PROVIDER_MISCONFIGURED',
        'Setu credentials are not configured (SETU_PROVIDER=live requires client id/secret/product-instance-id)',
      );
    }
    return {
      'x-client-id': clientId,
      'x-client-secret': clientSecret,
      'x-product-instance-id': productInstanceId,
    };
  }

  private request(path: string, init: RequestInit = {}): Promise<Response> {
    const url = `${this.setu.baseUrl}${path}`;
    return fetch(url, {
      ...init,
      headers: { ...this.headers(), ...(init.headers ?? {}) },
    }).catch((err: unknown) => {
      this.logger.error(`Setu request failed: ${path}`, err instanceof Error ? err.stack : undefined);
      throw new AppError(502, 'PROVIDER_UNAVAILABLE', 'eSign provider is unreachable');
    });
  }

  private async parse(res: Response, op: string): Promise<unknown> {
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = text;
    }
    if (!res.ok) {
      this.logger.error(`Setu ${op} -> ${res.status}: ${text.slice(0, 500)}`);
      throw new AppError(502, 'PROVIDER_UNAVAILABLE', 'eSign provider returned an error', {
        upstreamStatus: res.status,
      });
    }
    return json;
  }
}
