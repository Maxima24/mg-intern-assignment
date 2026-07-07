# Design document — Mango eSign

## 1. Problem & goals

Send a contract PDF out for **Aadhaar eSign** via Setu, track the signature, and retrieve
the signed document — while keeping **all Setu communication server-side**. Secondary goals:
a clean, typed contract between frontend and backend; the ability to demo the full flow
without credentials; and a production-shaped structure (layering, tests, deployability).

## 2. System architecture

```mermaid
flowchart LR
  subgraph Browser
    UI[Next.js UI]
  end

  subgraph Vercel
    WEB[Next.js app<br/>landing · upload · status · signing-complete]
  end

  subgraph Railway
    API[NestJS API<br/>/api/*]
    PG[(Postgres<br/>signature_requests)]
  end

  SETU[Setu Aadhaar eSign<br/>dg-sandbox.setu.co]
  R2[(Cloudflare R2<br/>original + signed PDFs)]

  UI -->|HTTPS, CORS| WEB
  WEB -->|fetch NEXT_PUBLIC_API_BASE_URL| API
  API -->|x-client-id/secret/product-instance-id| SETU
  API --> PG
  API --> R2
  SETU -.webhook ESIGN_WEBHOOK_NOTIFICATION.-> API
  SETU -.redirect after signing.-> WEB
```

The browser only ever talks to our API. The API is the only tier that holds Setu
credentials and the only tier that reaches Setu or R2. Setu reaches back two ways: a
server-to-server **webhook** and a browser **redirect** to `NEXT_PUBLIC_SITE_URL/signing-complete`
(treated as a hint — the true status is always re-fetched).

## 3. Backend layering

```mermaid
flowchart TD
  C[EsignController<br/>HTTP + DTO validation] --> S[EsignService<br/>orchestration only]
  W[SetuWebhookController] --> S
  S --> SC[SetuClient<br/>stub &#124; live]
  S --> ST[StorageService<br/>stub &#124; R2]
  S --> R[EsignRepository<br/>sole Prisma access]
  SC -. deriveFromSetu .-> S
  S -. toSignatureRecordDto .-> C
  R --> DB[(Postgres)]
  SC --> SETU[Setu REST]
  ST --> R2[(R2)]
```

- **Controller** — HTTP concerns only: multipart handling, size cap, DTO validation.
- **Service** — orchestration; holds no Prisma or wire types, only mapper outputs.
- **SetuClient** — the only Setu talker; `setu.mapper` turns its wire shape into our fields.
- **StorageService** — the only R2 talker.
- **EsignRepository** — the only Prisma talker; `esign.mapper` turns entities into DTOs.

This makes each unit independently testable (the service tests mock all three collaborators).

## 4. Key flows

### 4.1 Upload → create signature request

```mermaid
sequenceDiagram
  participant U as Browser
  participant W as Next.js
  participant A as NestJS API
  participant Se as Setu
  participant St as R2
  participant DB as Postgres

  U->>W: fill form + drop PDF
  W->>A: POST /api/upload-contract (multipart)
  A->>A: validate fields + %PDF- magic bytes
  A->>Se: POST /api/documents (upload)
  Se-->>A: { id: documentId }
  A->>Se: POST /api/signature (documentId, redirectUrl, signers)
  Se-->>A: { id: signatureId, status, signers[].url }
  A->>St: put original PDF (best-effort)
  A->>DB: insert signature_requests row
  A-->>W: SignatureRecord (documentId, signatureId, status, signerUrl)
  W-->>U: result card + "Open signing page"
```

### 4.2 Sign → poll → download (with webhook as push complement)

```mermaid
sequenceDiagram
  participant U as Browser
  participant W as Next.js
  participant A as NestJS API
  participant Se as Setu
  participant St as R2

  U->>Se: open signerUrl, Aadhaar OTP, eSign
  Se-->>U: redirect to /signing-complete (id, success)
  loop every 4s until terminal
    W->>A: GET /api/signature-status/:id
    A->>Se: GET /api/signature/:id
    Se-->>A: status and signatureDetails
    A->>A: persist and classify status (stops on sign_complete)
    A-->>W: SignatureRecord
  end
  Se-->>A: POST /api/webhooks/setu (HMAC) updates record early
  U->>W: click Download
  W->>A: GET /api/download/:id
  alt signed PDF cached in R2
    A->>St: get signed.pdf
  else first download
    A->>Se: GET /api/signature/:id/download (pre-signed URL)
    A->>Se: GET pre-signed URL to fetch bytes
    A->>St: cache signed.pdf
  end
  A-->>W: application/pdf (streamed attachment)
```

Polling and the webhook converge on the same record via the shared `classifySetuStatus`
and `deriveFromSetu`, so whichever arrives first wins and the other is idempotent.

## 5. The stub / live seam

`SETU_PROVIDER` (auto-derived from credential presence) selects behaviour inside one
`SetuClient`:

| Operation | `stub` | `live` |
| --- | --- | --- |
| uploadDocument | random `doc_…` id | `POST /api/documents` multipart |
| createSignature | `sign_initiated` + `mock-sign` URL derived from redirectUrl origin | `POST /api/signature` |
| getSignature | in-memory state machine advances `pending → in_progress → complete` | `GET /api/signature/:id` |
| getDownloadInfo / fetchDocumentBytes | generated valid PDF | pre-signed URL → bytes |
| verifyWebhookSignature | bypassed | HMAC-SHA256 + constant-time compare |

Because every layer above `SetuClient` is identical in both modes, going live is purely an
env change. `StorageService` follows the same pattern (`stub` in-memory | `r2`).

## 6. Data model

A single `signature_requests` table (documented in the [README](../README.md#database)).
Design notes: **status stored as a raw string** and classified in-app (no enum migrations);
**single-signer denormalized** with a full `raw_setu` JSON snapshot for audit and future
multi-signer needs; **app-generated prefixed ids** (`req_…`) keep our public id independent
of Setu's.

## 7. Security model

- Setu/DB/R2 secrets are backend-only; nothing sensitive is a `NEXT_PUBLIC_*`.
- Browser → our API → Setu; the signed PDF's pre-signed URL is consumed server-side and the
  bytes streamed through us, so the browser never sees Setu or S3 URLs.
- Content-based PDF validation (magic bytes), 10 MB cap, class-validator on every field,
  CORS scoped to the web origin, helmet headers.
- HMAC-verified webhooks over the raw body; upstream errors mapped to a generic 502.
- Production: managed secret store + rotation (config read at boot → rotation = restart),
  least-privilege DB creds, `raw_setu` + timestamps as an audit trail, TLS end-to-end.

## 8. Resilience & failure handling

- **Terminal short-circuit** — `refreshStatus` returns immediately for `sign_complete`
  records, avoiding needless Setu calls and any regression.
- **Best-effort storage** — a failed R2 write is logged but never fails upload or download.
- **Signed-PDF cache** — downloads survive Setu's expiring URLs after the first fetch.
- **Idempotent updates** — webhook and polling can both apply the same terminal state safely.

## 9. Trade-offs & future work

- Stub Setu state is per-process; a durable stub would persist it, but the DB already holds
  the authoritative last status.
- A reconciliation cron (poll stuck requests as a webhook backstop) and an append-only audit
  table are natural next steps — the seams and `raw_setu` snapshots already support them.
- Multi-signer support would move the denormalized signer columns into a child table; the
  `raw_setu` snapshot means this is additive, not a rewrite.
