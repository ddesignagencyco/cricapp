FROM node:20-bullseye-slim AS base
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*

# ---------- install ----------
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN npm ci

# ---------- build ----------
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules

COPY package.json package-lock.json ./
COPY apps/api ./apps/api
COPY packages/shared-types ./packages/shared-types

RUN npx prisma generate --schema=apps/api/prisma/schema.prisma
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

CMD ["sh", "-c", "npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma && node apps/api/dist/src/main.js"]
