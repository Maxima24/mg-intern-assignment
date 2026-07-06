/**
 * Typed configuration factory (loaded once via ConfigModule.forRoot).
 *
 * Every setting is read from process.env here and nowhere else, so the rest of
 * the app depends on `ConfigService.get('setu.baseUrl')` rather than env access
 * scattered through services.
 *
 * The Setu `provider` mode auto-derives: if a client id is present we default to
 * 'live', otherwise 'stub' — so the app runs end-to-end with zero credentials and
 * flips to the real sandbox the moment creds are supplied.
 */

export type SetuProviderMode = 'stub' | 'live';
export type StorageProviderMode = 'stub' | 'r2';

const parseOrigins = (csv: string | undefined): string[] =>
  (csv ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const appConfig = () => {
  const clientId = process.env.SETU_CLIENT_ID ?? null;
  const explicitMode = process.env.SETU_PROVIDER as SetuProviderMode | undefined;

  const r2AccessKey = process.env.R2_ACCESS_KEY_ID ?? null;
  const explicitStorage = process.env.STORAGE_PROVIDER as StorageProviderMode | undefined;

  return {
    app: {
      nodeEnv: process.env.NODE_ENV ?? 'development',
      port: Number.parseInt(process.env.PORT ?? '4000', 10),
      corsOrigins: parseOrigins(process.env.CORS_ORIGINS),
    },
    setu: {
      provider: explicitMode ?? (clientId ? 'live' : 'stub'),
      baseUrl: process.env.SETU_BASE_URL ?? 'https://dg-sandbox.setu.co',
      clientId,
      clientSecret: process.env.SETU_CLIENT_SECRET ?? null,
      productInstanceId: process.env.SETU_PRODUCT_INSTANCE_ID ?? null,
      webhookSecret: process.env.SETU_WEBHOOK_SECRET ?? null,
      // Signing-session realism knob for stub mode: how many status polls before
      // the mock signature reaches sign_complete.
      stubPollsToComplete: Number.parseInt(process.env.SETU_STUB_POLLS ?? '3', 10),
    },
    storage: {
      // 'stub' keeps objects in memory (no creds needed); 'r2' uses Cloudflare R2
      // (S3-compatible). Auto-derives to 'r2' when an access key is present.
      provider: explicitStorage ?? (r2AccessKey ? 'r2' : 'stub'),
      bucket: process.env.R2_BUCKET ?? 'mango-esign',
      endpoint: process.env.R2_ENDPOINT ?? null, // https://<accountId>.r2.cloudflarestorage.com
      region: process.env.R2_REGION ?? 'auto',
      accessKeyId: r2AccessKey,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? null,
    },
  };
};

export type AppConfig = ReturnType<typeof appConfig>;
export type SetuConfig = AppConfig['setu'];
export type StorageConfig = AppConfig['storage'];
