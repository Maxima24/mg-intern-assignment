# CLAUDE.md — working in this repo

Context for AI-assisted development (Claude Code / Cursor / etc.). Keep this current; it is
the fast path to being productive here without re-reading everything.

## What this is

Mango eSign — a Turborepo monorepo integrating **Setu Aadhaar eSign**. Next.js frontend
(`apps/web`) + NestJS backend (`apps/api`) sharing a typed contract (`packages/shared`).
All Setu calls are server-side. The app runs end-to-end with **no credentials** via stub
seams. Full rationale: [docs/DESIGN.md](docs/DESIGN.md) and [DECISIONS.md](DECISIONS.md).

## Golden rules

- **The frontend never calls Setu.** It calls our API (`NEXT_PUBLIC_API_BASE_URL`) only.
- **Secrets are backend-only.** Never introduce a `NEXT_PUBLIC_` var for anything sensitive.
- **The contract is generated, not hand-written.** After changing an api DTO, run
  `pnpm --filter api openapi && pnpm --filter @mango/shared types:gen`. The web imports wire
  types from `@mango/shared/api` (`components['schemas'][...]`) — never redeclare them.
- **Respect the backend layering.** Controller → Service → (SetuClient | StorageService |
  EsignRepository). The service must not import Prisma or Setu wire types; cross boundaries
  with the mappers (`setu.mapper`, `esign.mapper`).
- **New external integrations follow the seam pattern** (`SetuClient`/`StorageService`): one
  injectable service, `isStub()` branch, config-injected creds, typed in/out.

## Conventions

- Files: **kebab-case**, role-suffixed (`*.controller.ts`, `*.service.ts`, `*.client.ts`,
  `*.mapper.ts`, `*.repository.ts`). Named exports (except Next `page`/`layout`/`route`).
- Backend errors: throw `AppError(status, 'CODE', message, details?)`; the global filter
  emits `{ error: { code, message, details? } }`. Don't return ad-hoc error shapes.
- Frontend: RSC page shells → `"use client"` feature components; TanStack Query for data
  (string-array keys), react-hook-form + zod for forms, Tailwind v4 tokens + CVA `ui/`
  primitives. `cn()` from `lib/utils`.
- Heavy top-of-file comments on non-trivial files explaining *why* — keep that density.

## Commands

```bash
pnpm dev                      # api :4000 + web :3000 (+ shared watch)
pnpm --filter api db:migrate  # prisma migrate dev
pnpm --filter api test        # unit    ·  test:e2e for supertest
pnpm typecheck && pnpm lint && pnpm build   # quality gates (all must pass)
```

Local Postgres: `docker run -d --name mango-pg -e POSTGRES_USER=mango -e POSTGRES_PASSWORD=mango -e POSTGRES_DB=mango_esign -p 5544:5432 postgres:16`

## Where things are

- Setu integration seam → `apps/api/src/modules/setu/setu.client.ts`
- Orchestration → `apps/api/src/modules/esign/esign.service.ts`
- Persistence boundary → `apps/api/src/modules/esign/esign.repository.ts`
- Status vocabulary + classifier (shared) → `packages/shared/src/setu-status.ts`
- Web API layer → `apps/web/lib/api/{client,esign}.ts`
- Pages → `apps/web/app/{page,upload,status,signing-complete,mock-sign}`

## Gotchas

- `SetuClient` stub ids are **random per upload** (not derived) — re-uploading the same file
  must not collide on `signature_id`.
- PDF validation is a pure-JS `%PDF-` magic-byte check in the service (Nest's ESM
  `FileTypeValidator` doesn't load under ts-jest). Don't reintroduce it.
- The web app has **no** `output: 'standalone'` (Vercel handles output; standalone tracing
  also fails on Windows symlink perms).
- `api.gen.ts` is committed so the web builds standalone on Vercel; regenerate it when the
  contract changes.
