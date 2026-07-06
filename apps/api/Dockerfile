# Multi-stage build for the NestJS api. Build context is the REPO ROOT (so the
# @mango/shared workspace package is available). `pnpm deploy` produces a
# self-contained /app with prod deps + the built shared package injected.

FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /repo

# Install with a warm layer cache (manifests first, then the rest).
COPY pnpm-lock.yaml pnpm-workspace.yaml .npmrc package.json turbo.json ./
COPY packages/shared/package.json packages/shared/
COPY packages/tsconfig/package.json packages/tsconfig/
COPY packages/eslint-config/package.json packages/eslint-config/
COPY packages/prettier-config/package.json packages/prettier-config/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile

# Build the shared contract, generate the Prisma client (types), build the api.
COPY packages ./packages
COPY apps/api ./apps/api
RUN pnpm --filter @mango/shared build \
  && pnpm --filter api exec prisma generate \
  && pnpm --filter api build

# Self-contained production bundle, then ensure built output + schema are present
# and generate the Prisma client into it (call the binary directly — no pnpm/corepack
# in the runtime image). rm+cp is idempotent whether or not deploy already copied them.
RUN pnpm --filter api deploy --prod /app \
  && rm -rf /app/dist /app/prisma \
  && cp -r apps/api/dist /app/dist \
  && cp -r apps/api/prisma /app/prisma \
  && cd /app && ./node_modules/.bin/prisma generate

# ---- runtime ----
FROM node:20-alpine AS runner
RUN apk add --no-cache tini
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
EXPOSE 4000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/main.js"]
