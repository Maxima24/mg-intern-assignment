# Architecture decisions

Short records of the choices that shaped this project and the trade-offs behind them.

### 1. pnpm + Turborepo monorepo with a shared contract package

One repo holds `apps/web`, `apps/api`, and shared `packages/*`. `@mango/shared` is the
single source of truth for the status vocabulary, the upload form schema, and the generated
wire types. **Why:** the frontend and backend cannot drift, and CI runs one cached task
graph. Apps are unscoped (`web`, `api`) so `pnpm --filter`/host filters resolve; packages
are scoped `@mango/*`.

### 2. FE↔BE contract via OpenAPI codegen, not shared zod

The backend uses **class-validator DTOs**; `@nestjs/swagger` emits `openapi.json`, and
`openapi-typescript` generates `packages/shared/src/api.gen.ts`, which the web imports as
`components['schemas'][...]`. zod is used only for the frontend form and mock data.
**Why:** the API's own OpenAPI spec is authoritative, so a DTO change that breaks the
frontend fails `typecheck`. This mirrors the reference codebase's convention and avoids
coupling the whole app to one zod runtime. **Trade-off:** an explicit codegen step
(`pnpm openapi && pnpm types:gen`) after contract changes; `api.gen.ts` is committed so the
web builds standalone on Vercel.

### 3. The Setu integration is a single-class seam (`stub` | `live`)

`SetuClient` branches on `isStub()` per method — deterministic fakes vs. real REST — rather
than a port + factory with two implementations. **Why:** it matches the reference
provider-client pattern, keeps the wire-format knowledge in one place, and lets the entire
flow (including signed-PDF download) run with **zero credentials**. The stub keeps a small
in-memory state machine so status advances realistically across polls. **Trade-off:** stub
state is per-process (resets on restart); acceptable because the DB holds the last-known
status and `refreshStatus` never regresses a terminal record.

### 4. Object storage is also a seam, backed by Cloudflare R2

`StorageService` (`stub` in-memory | `r2` via `@aws-sdk/client-s3`) stores our own copy of
the uploaded original and **caches the signed PDF** so downloads don't depend on Setu's
expiring pre-signed URL. **Why:** an independent audit copy and a durable download source.
Writes are best-effort — storage is never the source of truth for eSign state, so an R2
outage can't block the primary flow.

### 5. Standard Prisma client (no driver adapter)

We use the default `prisma-client-js` client against `DATABASE_URL`, 
not the pg driver
adapter. **Why:** for a normal long-lived Node server on Railway the standard client is
sufficient and has fewer moving parts; the adapter mainly benefits edge/serverless pooling.

### 6. Store the raw Setu status string, not a DB enum

`status`/`signer_status` are plain strings, classified in-app via `@mango/shared`. **Why:**
Setu adding or renaming a status never forces a migration. `raw_setu` (full JSON snapshot)
covers multi-signer futures and gives an audit trail without schema churn.

### 7. Error envelope `{ error: { code, message, details? } }`, no success wrapper

Every error leaves the API in one shape with a stable SCREAMING_SNAKE `code`; successful
responses return the DTO directly. **Why:** matches the reference backend and lets the web
client map failures uniformly. `STATUS_TO_CODE` maps HTTP status → code; upstream Setu
errors become a generic `502 PROVIDER_UNAVAILABLE` so internals never leak.

### 8. Global prefix `/api` (not `/v1`)

The reference backend versions with `/v1`; we use `/api` to match the assignment's stated
route names (`POST /api/upload-contract`, …). Health is excluded from the prefix at `/health`.

### 9. Pure-JS `%PDF-` magic-byte check instead of the ESM file-type validator

Nest's `FileTypeValidator` magic-number mode depends on the ESM-only `file-type` package,
which doesn't load under ts-jest (rejecting everything in tests). We validate the PDF magic
bytes in the service with a two-line synchronous check. **Why:** identical behaviour in
tests and production, still rejecting forged mimetypes, with no ESM/CJS interop risk.

### 10. Webhook controller lives in the Esign module

It needs `EsignService`, so placing it in the Setu module would create a circular module
dependency. It stays in `apps/api/src/modules/esign/setu-webhook.controller.ts` and injects
the global `SetuClient` for signature verification.

### 11. No authentication

The assignment has no auth requirement, so the app is intentionally unauthenticated. The
security surface that matters here — keeping Setu credentials server-side, validating input,
verifying webhooks — is addressed independently of user auth.
