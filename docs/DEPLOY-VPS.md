# Deploying to an India VPS (Docker Compose)

Setu's Data Gateway is geo/IP-restricted to India, so the backend must run from an
allow-listed India IP. This stack runs **Postgres + NestJS api + Next.js web + Caddy**
(automatic HTTPS) on one VPS behind a single domain.

```
                     ┌──────── VPS (India IP) ────────┐
 Browser ─ HTTPS ─▶  Caddy ──/api/*──▶ api (NestJS) ──▶ Setu (allow-listed)
                       │                   │
                       └──/*──▶ web        ├──▶ postgres
                                           └──▶ Cloudflare R2
```

## Prerequisites

1. A VPS in India with **Docker** + **Docker Compose v2** installed.
2. A **domain** with an `A` record pointing at the VPS IP (Caddy needs it for TLS).
3. Ports **80** and **443** open on the VPS firewall.
4. The VPS's **egress IP allow-listed by Setu** (email Setu support the output of
   `curl -s ifconfig.co` from the VPS). This is the step that unblocks the `403`.

## Deploy

```bash
# 1. Get the code onto the VPS
git clone <your-repo> mango && cd mango

# 2. Configure
cp .env.compose.example .env
nano .env          # set APP_DOMAIN, POSTGRES_PASSWORD, SETU_*, R2_*

# 3. Build + start everything
docker compose up -d --build

# 4. Watch it come up (Caddy will fetch a TLS cert on first run)
docker compose logs -f caddy api
```

The api container runs `prisma migrate deploy` on start, so the schema is created
automatically. Visit `https://<APP_DOMAIN>` — the full app is live.

## Configure the Setu webhook

In the Setu dashboard (or during onboarding), set the eSign notification URL to:

```
https://<APP_DOMAIN>/api/webhooks/setu
```

Use the same value for `SETU_WEBHOOK_SECRET` on both sides so HMAC verification passes.

## Verify

```bash
# api health (internal)
docker compose exec api wget -qO- http://localhost:4000/health

# through Caddy (public)
curl -s https://<APP_DOMAIN>/api/signatures

# live Setu reachability from the VPS (should NOT be an nginx 403 anymore)
curl -s -o /dev/null -w '%{http_code}\n' https://dg-sandbox.setu.co/
```

## Operations

```bash
docker compose ps                       # status
docker compose logs -f api              # tail api logs
docker compose up -d --build            # redeploy after a git pull
docker compose exec postgres psql -U mango -d mango_esign   # DB shell
docker compose down                     # stop (keeps volumes/data)
```

Data (Postgres) and TLS certs (Caddy) persist in named volumes across restarts.

## Notes

- **Same-origin, no CORS gymnastics:** the browser calls `https://<APP_DOMAIN>/api/*`,
  which Caddy routes to the api; `NEXT_PUBLIC_API_BASE_URL` is baked at build time from
  `APP_DOMAIN`, so redeploy the `web` image if you change the domain.
- **Secrets** live only in the VPS `.env` (gitignored) and are injected as container env —
  never baked into images (except the public `NEXT_PUBLIC_*`).
- **Stub fallback:** set `SETU_PROVIDER=stub` / `STORAGE_PROVIDER=stub` in `.env` to run
  without Setu/R2 (useful to smoke-test the box before creds are live).
