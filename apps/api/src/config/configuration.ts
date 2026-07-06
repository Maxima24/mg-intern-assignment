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

const parseOrigins = (csv: string | undefined): string[] =>
  (csv ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export const appConfig = () => {
  const clientId = process.env.SETU_CLIENT_ID ?? null;
  const explicitMode = process.env.SETU_PROVIDER as SetuProviderMode | undefined;

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
      stubPollsToComplete: Number.parseInt(process.env.SETU_STUB_POLLS ?? '2', 10),
    },
  };
};

export type AppConfig = ReturnType<typeof appConfig>;
export type SetuConfig = AppConfig['setu'];
