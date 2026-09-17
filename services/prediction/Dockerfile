FROM node:20-alpine AS base

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

# ---------- production ----------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 cricapp && \
    adduser --system --uid 1001 cricapp

COPY --from=deps /app/node_modules ./node_modules

COPY services/prediction ./services/prediction
COPY packages/shared-types ./packages/shared-types

RUN chown -R cricapp:cricapp /app
USER cricapp

CMD ["node", "services/prediction/src/index.js"]
