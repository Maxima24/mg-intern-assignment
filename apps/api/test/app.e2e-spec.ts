import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { type INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/filters/http-exception.filter';
import { buildStubPdf } from '../src/modules/setu/stub-pdf';

/**
 * Full-flow e2e in stub mode. Requires a reachable Postgres (DATABASE_URL from .env).
 * Mirrors main.ts bootstrap so behaviour matches production.
 *
 * We attach the PDF from a real file path (not an in-memory Buffer): superagent's
 * Buffer transport re-chunks the bytes in a way that trips the magic-number
 * FileTypeValidator, whereas a file path streams the exact bytes (like a browser/curl).
 */
describe('eSign flow (e2e, stub mode)', () => {
  let app: INestApplication;
  const pdfPath = join(tmpdir(), 'mango-e2e-contract.pdf');

  beforeAll(async () => {
    process.env.SETU_PROVIDER = 'stub';
    process.env.SETU_STUB_POLLS = '2';
    writeFileSync(pdfPath, buildStubPdf(['e2e test contract']));
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication({ rawBody: true });
    app.setGlobalPrefix('api', { exclude: ['health'] });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app?.close();
  });

  it('GET /health returns ok', () =>
    request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.status).toBe('ok');
        expect(typeof res.body.timestamp).toBe('string');
      }));

  it('rejects a non-PDF upload with 400 INVALID_FILE', () =>
    request(app.getHttpServer())
      .post('/api/upload-contract')
      .field('signerName', 'Aarav')
      .field('signerIdentifier', 'a@b.com')
      .field('redirectUrl', 'http://localhost:3000/signing-complete')
      .attach('file', Buffer.from('not a pdf'), { filename: 'x.txt', contentType: 'application/pdf' })
      .expect(400)
      .expect((res) => expect(res.body.error.code).toBe('INVALID_FILE')));

  it('uploads, polls to completion, and downloads the signed PDF', async () => {
    const upload = await request(app.getHttpServer())
      .post('/api/upload-contract')
      .field('signerName', 'Aarav Sharma')
      .field('signerIdentifier', 'aarav@example.com')
      .field('redirectUrl', 'http://localhost:3000/signing-complete')
      .attach('file', pdfPath)
      .expect(201);

    const sig = upload.body.signatureId as string;
    expect(sig).toMatch(/^sig_/);
    expect(upload.body.status).toBe('sign_initiated');

    let status = upload.body.status as string;
    for (let i = 0; i < 6 && status !== 'sign_complete'; i += 1) {
      const res = await request(app.getHttpServer()).get(`/api/signature-status/${sig}`).expect(200);
      status = res.body.status;
    }
    expect(status).toBe('sign_complete');

    // Before-complete guard is covered by the unit tests; here the doc is complete.
    const download = await request(app.getHttpServer()).get(`/api/download/${sig}`).expect(200);
    expect(download.headers['content-type']).toContain('application/pdf');
    expect(download.body.subarray(0, 5).toString()).toBe('%PDF-');
  }, 30000);

  it('returns 404 for an unknown signature id', () =>
    request(app.getHttpServer()).get('/api/signature-status/sig_does_not_exist').expect(404));
});
