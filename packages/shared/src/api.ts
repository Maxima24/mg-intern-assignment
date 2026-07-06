/**
 * @mango/shared/api — generated wire contract.
 *
 * Re-exports the openapi-typescript output. Regenerate after any api DTO change:
 *   pnpm --filter api openapi        # emit apps/api/openapi.json
 *   pnpm --filter @mango/shared types:gen
 *
 * Web usage:
 *   import type { components } from '@mango/shared/api';
 *   type SignatureRecord = components['schemas']['SignatureRecordDto'];
 */
export * from './api.gen';
export type { components, paths, operations } from './api.gen';
