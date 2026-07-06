# Mango eSign

A full-stack application for sending contracts out for **Aadhaar eSign** through
[Setu](https://setu.co/data/esign/). Upload a PDF, generate a legally-backed Aadhaar
signing link, track the signature status in real time, and download the signed
document — with **every Setu API call happening server-side** so credentials never
reach the browser.

> Built as a Turborepo monorepo: a **Next.js** frontend and a **NestJS** backend that
> share a single typed contract. It runs **end-to-end with zero Setu credentials** via a
> built-in stub provider, and switches to the real Setu sandbox by setting one env var.

| Deliverable | Link |
| --- | --- |
| Web app (Vercel) | _add after deploy_ |
| API + Swagger (Railway) | _add after deploy_ · `/docs` |
| Design doc | [docs/DESIGN.md](docs/DESIGN.md) |
| Architecture decisions | [DECISIONS.md](DECISIONS.md) |

---

## Contents

- [What it does](#what-it-does)
- [Architecture](#architecture)
- [Tech stack (and why)](#tech-stack-and-why)
- [Repository layout](#repository-layout)
- [Quick start (stub mode, no credentials)](#quick-start-stub-mode-no-credentials)
- [Environment variables](#environment-variables)
- [Getting Setu credentials & going live](#getting-setu-credentials--going-live)
- [Testing](#testing)
- [Deployment](#deployment)
- [Security](#security)
- [Database](#database)
- [API reference](#api-reference)

---

## What it does

Three pages, one flow:

1. **Upload** — drop a PDF and the signer's details. The backend uploads the document
   to Setu, creates a signature request, stores its own copy of the file in object
   storage, persists the metadata, and returns a **signing link**.
2. **Sign** — the signer opens Setu's hosted page, verifies with Aadhaar OTP, and eSigns.
3. **Track & download** — the status page polls the backend (which re-fetches from Setu)
   until the signature completes, then lets you **download the signed PDF**, streamed back
   through the backend.

A **webhook** endpoint receives Setu's completion notifications (HMAC-verified) as a push
complement to polling.

## Architecture

```
Browser ──▶ Next.js (Vercel) ──▶ NestJS API (Railway) ──▶ Setu Aadhaar eSign
                                        │
                                        ├──▶ Postgres (metadata)
                                        └──▶ Cloudflare R2 (original + signed PDFs)
```

The frontend only ever talks to **our** API. The API is the only tier that holds Setu
credentials and the only tier that talks to Setu. See
[docs/DESIGN.md](docs/DESIGN.md) for the system + sequence diagrams and the request
lifecycle.

**The Setu client is a seam.** A single `SetuClient` service branches on `SETU_PROVIDER`:
`stub` returns deterministic fakes (advancing a signature through
`sign_initiated → sign_pending → sign_in_progress → sign_complete` over successive polls,
and serving a generated PDF for downloads), while `live` makes real REST calls to the
sandbox. Everything above the client is identical in both modes, so the whole app —
including the signed-PDF download — works before any credentials exist. Object storage has
the same seam (`stub` in-memory | `r2` Cloudflare R2).

## Tech stack (and why)

| Area | Choice | Why |
| --- | --- | --- |
| Monorepo | **pnpm + Turborepo** | one repo, cached task graph, shared contract package |
| Frontend | **Next.js 15 (App Router) + TS** | RSC shells → client feature components; deploys to Vercel |
| Backend | **NestJS 11** | modules/DI, DTO validation, Swagger, clean layering |
| Contract | **class-validator DTOs → OpenAPI → `openapi-typescript`** | the backend's Swagger spec generates the frontend's wire types — they can't drift |
| Data fetching | **TanStack Query** | status polling that stops on terminal state; cache + retry policy |
| Forms | **react-hook-form + zod** | typed validation; `react-dropzone` for the PDF |
| Database | **Postgres + Prisma** | typed schema + migrations for the persisted metadata |
| Object storage | **Cloudflare R2** (`@aws-sdk/client-s3`) | our own copy of originals + a signed-PDF cache |
| Styling | **Tailwind v4** (CSS-first tokens) + CVA primitives | light/dark design system |
| Deploy | **Vercel** (web) + **Railway** (api + Postgres) | best host per service |

## Repository layout

```
mango/
├─ apps/
│  ├─ api/            # NestJS backend — the only tier that talks to Setu
│  │  ├─ src/
│  │  │  ├─ config/               # typed env config factory
│  │  │  ├─ common/               # AppError, global exception filter, id helper
│  │  │  ├─ prisma/               # PrismaModule + PrismaService
│  │  │  └─ modules/
│  │  │     ├─ setu/              # SetuClient seam (stub|live), mapper, status
│  │  │     ├─ storage/           # StorageService seam (stub|R2)
│  │  │     └─ esign/             # controller · service · repository · mappers · DTOs · webhook
│  │  ├─ prisma/                  # schema.prisma · migrations · seed
│  │  └─ Dockerfile
│  └─ web/            # Next.js frontend — talks only to our API
│     ├─ app/                     # landing · upload · status · signing-complete · mock-sign
│     ├─ components/{ui,layout,features}/
│     └─ lib/{api,env,utils}/
├─ packages/
│  ├─ shared/         # @mango/shared — zod form schemas, status classifier, generated api types
│  ├─ tsconfig/       # shared TS bases (base/library/nextjs/nestjs)
│  ├─ eslint-config/  # shared flat ESLint configs
│  └─ prettier-config/
├─ docs/DESIGN.md · DECISIONS.md · turbo.json · pnpm-workspace.yaml
```

### The backend's layering (architectural depth)

Strict one-way flow, with **mappers** crossing every boundary and a **repository** as the
sole Prisma access point:

```
Controller (HTTP + validation)
   └─▶ EsignService (orchestration only)
          ├─▶ SetuClient        (the only thing that talks to Setu)      ── setu.mapper ─┐
          ├─▶ StorageService    (the only thing that talks to R2)                        │
          └─▶ EsignRepository   (the only thing that touches Prisma)     ── esign.mapper ┘
```

The service holds no Prisma types and no Setu wire types — only mapper outputs. This keeps
each concern independently testable (see the mocked-dependency service tests).

## Quick start (stub mode, no credentials)

**Prerequisites:** Node ≥ 20, pnpm ≥ 9 (`corepack enable`), Docker (for local Postgres).

```bash
# 1. Install
pnpm install

# 2. Start Postgres (any port; the example uses 5544 to avoid local collisions)
docker run -d --name mango-pg \
  -e POSTGRES_USER=mango -e POSTGRES_PASSWORD=mango -e POSTGRES_DB=mango_esign \
  -p 5544:5432 postgres:16

# 3. Configure env
cp apps/api/.env.example apps/api/.env      # DATABASE_URL points at :5544, SETU_PROVIDER=stub
cp apps/web/.env.example apps/web/.env.local

# 4. Migrate + seed, then run everything
pnpm --filter api db:migrate
pnpm --filter api db:seed
pnpm dev                                    # api :4000 · web :3000
```

Open **http://localhost:3000**, upload any PDF, click **Open signing page** (the stub
signing screen), then watch the status page flip to *Signed* and download the document —
all with no Setu account.

## Environment variables

### Backend (`apps/api/.env`)

| Var | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | Postgres connection string |
| `PORT` | no (4000) | API port |
| `CORS_ORIGINS` | yes (prod) | comma-separated allowed web origins |
| `SETU_PROVIDER` | no | `stub` \| `live`; auto-derives to `live` when `SETU_CLIENT_ID` is set |
| `SETU_BASE_URL` | no | defaults to the sandbox `https://dg-sandbox.setu.co` |
| `SETU_CLIENT_ID` / `SETU_CLIENT_SECRET` / `SETU_PRODUCT_INSTANCE_ID` | live only | Setu Bridge credentials |
| `SETU_WEBHOOK_SECRET` | no | HMAC-SHA256 secret for webhook verification |
| `STORAGE_PROVIDER` | no | `stub` \| `r2`; auto-derives to `r2` when `R2_ACCESS_KEY_ID` is set |
| `R2_BUCKET` / `R2_ENDPOINT` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | r2 only | Cloudflare R2 |

### Frontend (`apps/web/.env.local`)

| Var | Notes |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | base URL of **our** API (includes `/api`) — never Setu |
| `NEXT_PUBLIC_SITE_URL` | this app's origin, used to build the Setu `redirectUrl` |

## Getting Setu credentials & going live

Setu's Aadhaar eSign is a regulated product, so sandbox access is granted through onboarding
rather than instant self-serve:

1. Create an account on the **Setu Bridge** dashboard: <https://bridge.setu.co>.
2. Open the **Aadhaar eSign** product and request sandbox access (the
   [quickstart](https://docs.setu.co/data/esign/quickstart) says to contact Setu — use the
   "Contact sales / onboarding" link on the [product page](https://setu.co/data/esign/)).
3. Once approved, generate an **OAuth client** under Org settings → API keys to get
   `x-client-id` + `x-client-secret`, and note your eSign **product instance id**.

Then flip the backend to live — no code changes:

```bash
SETU_PROVIDER=live
SETU_CLIENT_ID=...
SETU_CLIENT_SECRET=...
SETU_PRODUCT_INSTANCE_ID=...
SETU_WEBHOOK_SECRET=...   # share the receiving URL /api/webhooks/setu with Setu during onboarding
```

The only code path that changes behaviour is the non-stub branch of `SetuClient`; the rest
of the app is unchanged by construction.

## Testing

```bash
pnpm --filter api test        # 26 unit tests (classifier, mappers, SetuClient stub + HMAC, service)
pnpm --filter api test:e2e    # supertest: health · non-PDF reject · upload→poll→download · 404
pnpm typecheck && pnpm lint && pnpm build   # workspace-wide quality gates
```

The OpenAPI → types codegen means any backend contract change that breaks the frontend
fails `typecheck`. After changing a DTO: `pnpm --filter api openapi && pnpm --filter @mango/shared types:gen`.

## Deployment

**Backend + Postgres → Railway.** Create a project, add a **Postgres** plugin (provides
`DATABASE_URL`), and an api service pointing at `apps/api/Dockerfile` (build context = repo
root; `railway.json` at the repo root wires this). The image runs `prisma migrate deploy`
on start; health check is `/health`. Set `CORS_ORIGINS`, `SETU_*` and `R2_*` env vars.

**Frontend → Vercel.** Import the repo, set **Root Directory = `apps/web`**
(`apps/web/vercel.json` sets the turbo-aware build command that also builds `@mango/shared`).
Set `NEXT_PUBLIC_API_BASE_URL` to the Railway API URL + `/api`, and `NEXT_PUBLIC_SITE_URL`
to the Vercel URL. Add the Vercel origin to the API's `CORS_ORIGINS`.

## Security

- **Secrets are backend-only.** `SETU_*`, `DATABASE_URL`, and `R2_*` live in the API
  environment; nothing sensitive is ever exposed as `NEXT_PUBLIC_*`.
- **The browser never reaches Setu or S3.** The signed PDF's pre-signed URL is consumed
  server-side and the bytes are streamed through our API.
- **Input validation** everywhere (class-validator DTOs), **content-based** PDF checking
  (magic bytes, not just the mimetype), a **10 MB** size cap, and **CORS** scoped to the web
  origin, plus **helmet** headers.
- **Webhooks are HMAC-verified** against the raw request body (constant-time compare).
- **Upstream errors don't leak** — Setu failures are mapped to a generic `502`.

**Production secrets management.** Sandbox creds in env vars are fine for this assignment;
in production, store `SETU_CLIENT_SECRET` etc. in a managed secret store (AWS/GCP Secrets
Manager or HashiCorp Vault) injected at deploy time, never committed and never in
`NEXT_PUBLIC_*`. Enable **rotation** on a schedule and on suspected exposure — because the
app reads config at boot, rotation is a restart, not a redeploy. Scope least-privilege DB
credentials, keep the `rawSetu` + timestamp audit trail, and terminate TLS end-to-end. The
`stub` seams mean CI/preview environments need **zero** secrets.

## Database

One table, `signature_requests` (see [apps/api/prisma/schema.prisma](apps/api/prisma/schema.prisma)):

| Column | Purpose |
| --- | --- |
| `id` | app-generated `req_…` primary key |
| `document_id`, `signature_id` | Setu identifiers (`signature_id` unique — the lookup key) |
| `file_name`, `document_name` | uploaded document |
| `signer_name`, `signer_identifier`, `birth_year` | signer (single-signer scope) |
| `status`, `signer_status` | raw Setu status strings, classified in-app |
| `signer_url` | hosted signing link |
| `original_storage_key`, `signed_storage_key` | R2 object keys |
| `signature_details` (JSON) | Aadhaar-derived fields on completion |
| `raw_setu` (JSON) | full last-seen Setu payload (audit/debug) |
| `created_at`, `updated_at` | timestamps |

We store the **raw status string** (not a DB enum) so a new Setu status never forces a
migration, and `raw_setu` covers multi-signer futures without a schema change.

## API reference

Interactive docs (Swagger) at **`/docs`**; the OpenAPI JSON at `/api/openapi.json`.

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/upload-contract` | multipart PDF + signer fields → create signature request |
| `GET` | `/api/signatures` | recent requests (DB-backed) |
| `GET` | `/api/signature-status/:id` | latest status (re-fetched from Setu + persisted) |
| `GET` | `/api/download/:id` | stream the signed PDF through the backend |
| `POST` | `/api/webhooks/setu` | receive Setu notifications (HMAC-verified) |
| `GET` | `/health` | liveness |
