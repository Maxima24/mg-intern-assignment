import { createHmac } from 'node:crypto';
import type { ConfigService } from '@nestjs/config';
import type { SetuConfig } from '../../config/configuration';
import { SetuClient } from './setu.client';

function makeClient(overrides: Partial<SetuConfig> = {}): SetuClient {
  const setu: SetuConfig = {
    provider: 'stub',
    baseUrl: 'https://dg-sandbox.setu.co',
    clientId: null,
    clientSecret: null,
    productInstanceId: null,
    webhookSecret: null,
    stubPollsToComplete: 3,
    ...overrides,
  };
  const config = { get: (key: string) => (key === 'setu' ? setu : undefined) } as ConfigService;
  return new SetuClient(config);
}

describe('SetuClient (stub mode)', () => {
  it('reports stub mode and produces a signing URL from the redirectUrl origin', async () => {
    const client = makeClient();
    expect(client.isStub()).toBe(true);

    const up = await client.uploadDocument({
      buffer: Buffer.from('%PDF-1.4'),
      filename: 'a.pdf',
      name: 'A',
    });
    expect(up.documentId).toMatch(/^doc_/);

    const sig = await client.createSignature({
      documentId: up.documentId,
      redirectUrl: 'http://localhost:3000/signing-complete',
      signers: [{ identifier: 'a@b.com', displayName: 'Aarav' }],
    });
    expect(sig.status).toBe('sign_initiated');
    expect(sig.signers[0].url).toContain('http://localhost:3000/mock-sign/');
  });

  it('advances status across polls: pending -> in_progress -> complete', async () => {
    const client = makeClient({ stubPollsToComplete: 3 });
    const sig = await client.createSignature({
      documentId: 'doc_x',
      redirectUrl: 'http://localhost:3000/signing-complete',
      signers: [{ identifier: 'a@b.com', displayName: 'Aarav' }],
    });

    expect((await client.getSignature(sig.id)).status).toBe('sign_pending');
    expect((await client.getSignature(sig.id)).status).toBe('sign_in_progress');
    const done = await client.getSignature(sig.id);
    expect(done.status).toBe('sign_complete');
    expect(done.signers[0].status).toBe('signed');
    expect(done.signers[0].signatureDetails?.aadhaarName).toBeTruthy();
  });

  it('returns a valid PDF for a stub download url', async () => {
    const client = makeClient();
    const { buffer, contentType } = await client.fetchDocumentBytes('stub://signed/sig_x');
    expect(contentType).toBe('application/pdf');
    expect(buffer.subarray(0, 5).toString()).toBe('%PDF-');
  });

  it('bypasses webhook signature verification in stub mode', () => {
    expect(makeClient().verifyWebhookSignature('{}', undefined)).toBe(true);
  });
});

describe('SetuClient webhook HMAC (live mode)', () => {
  const secret = 'top-secret';
  const client = makeClient({ provider: 'live', webhookSecret: secret });
  const body = JSON.stringify({ event: 'ESIGN_WEBHOOK_NOTIFICATION' });

  it('accepts a correct HMAC-SHA256 signature', () => {
    const sig = createHmac('sha256', secret).update(body, 'utf8').digest('hex');
    expect(client.verifyWebhookSignature(body, sig)).toBe(true);
  });

  it('rejects a wrong signature and a missing one', () => {
    expect(client.verifyWebhookSignature(body, 'deadbeef')).toBe(false);
    expect(client.verifyWebhookSignature(body, undefined)).toBe(false);
  });
});
