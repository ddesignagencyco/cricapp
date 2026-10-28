# Prisma 7 needs Node >= 20.19; Node 20 is end-of-life, so build on Node 22 LTS.
FROM node:22-bookworm-slim AS base

# ---------- install ----------
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY services/ingestion/package.json ./services/ingestion/
COPY services/prediction/package.json ./services/prediction/

RUN npm ci

# ---------- build ----------
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY package.json package-lock.json ./
COPY apps/api ./apps/api
COPY packages/shared-types ./packages/shared-types

RUN npx prisma generate --config apps/api/prisma.config.ts
RUN npm run build -w apps/api

# ---------- production ----------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN groupadd --system --gid 1001 cricapp && \
    useradd --system --uid 1001 --gid cricapp cricapp

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api ./apps/api
COPY --from=builder /app/packages/shared-types ./packages/shared-types
COPY --from=builder /app/package.json ./

RUN chown -R cricapp:cricapp /app
USER cricapp

EXPOSE 3001

# Migrations read DIRECT_URL (falling back to DATABASE_URL) from prisma.config.ts.
CMD ["sh", "-c", "npx prisma migrate deploy --config apps/api/prisma.config.ts && node apps/api/dist/src/main.js"]
