# Multi-stage build for the Next.js web app. Build context is the REPO ROOT.
# NEXT_PUBLIC_* are baked at BUILD time, so the target domain is passed as build args.

FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /repo

# Install with a warm layer cache (manifests first).
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json turbo.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/prettier-config/package.json packages/prettier-config/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile

# Public config, baked into the client bundle at build time.
ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# Build the shared contract, then the web app.
COPY packages ./packages
COPY apps/web ./apps/web
RUN pnpm --filter @mango/shared build && pnpm --filter web build

# Self-contained production bundle; overlay the built .next + public.
RUN pnpm --filter web deploy --prod /app \
  && rm -rf /app/.next && cp -r apps/web/.next /app/.next \
  && (cp -r apps/web/public /app/public 2>/dev/null || true)

# ---- runtime ----
FROM node:20-alpine AS runner
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node_modules/.bin/next", "start", "-p", "3000", "-H", "0.0.0.0"]
