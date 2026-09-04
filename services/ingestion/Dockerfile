FROM node:20-alpine AS base

# ---------- install ----------
FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json ./
COPY services/ingestion/package.json ./services/ingestion/
COPY packages/shared-types/package.json ./packages/shared-types/

RUN npm ci

# ---------- production ----------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 cricapp && \
    adduser --system --uid 1001 cricapp

COPY --from=deps /app/node_modules ./node_modules

COPY services/ingestion ./services/ingestion
COPY packages/shared-types ./packages/shared-types

RUN chown -R cricapp:cricapp /app
USER cricapp

CMD ["node", "services/ingestion/src/index.js"]
