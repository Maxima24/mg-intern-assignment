# Postman collection (Stage 1)

Import these two files into Postman:

- `mango-esign.postman_collection.json` — the requests
- `setu-sandbox.postman_environment.json` — the variables

## Setup

1. Import both files (**Import** button, top-left).
2. Select the **Setu Sandbox** environment (top-right dropdown).
3. Fill in the three credential variables (environment → edit): `x-client-id`,
   `x-client-secret`, `x-product-instance-id`.
4. Because Setu's Data Gateway is India-restricted, run these from an **India IP**
   (the VPS, or a machine on an India VPN) — otherwise every call returns a gateway `403`.

## Collection layout

**Setu (direct sandbox)** — Stage 1, calls Setu directly. Requests chain automatically:

| # | Request | What it does |
|---|---|---|
| 1 | Upload document | `POST /api/documents` (multipart) → captures `documentId` |
| 2 | Create signature request | `POST /api/signature` → captures `signatureId`, logs the signer url |
| 3 | Signature status | `GET /api/signature/:id` → poll until `sign_complete` |
| 4 | Download signed document | `GET /api/signature/:id/download/` → `{ downloadUrl }` |

Attach a PDF in request **1** (Body → form-data → `document` → Select Files). The test
scripts pass `documentId`/`signatureId` forward, so just run them top to bottom.

To reach `sign_complete`: after request 2, open the logged **signer url**, enter test
Aadhaar **999999990019** and OTP **123456**, then run requests 3–4.

**Mango backend (our API)** — the same flow through our own API (which is the only tier
that talks to Setu). Point `apiHost` at `http://localhost:4000` locally, or your deployed
domain. Attach a PDF in **1. Upload contract**.

> Note: the assignment lists the download as `GET /api/documents/:id/download`, but the real
> Setu endpoint is `GET /api/signature/:id/download` (keyed by the signature request id,
> returns JSON). This collection uses the correct one.
