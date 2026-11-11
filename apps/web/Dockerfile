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

# NEXT_PUBLIC_* values are inlined into the client bundle at build time, so they must be
# present here (Render passes service env vars as build args).
ARG NEXT_PUBLIC_API_URL
ARG API_URL
ARG NEXT_PUBLIC_ADSENSE_CLIENT
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    API_URL=$API_URL \
    NEXT_PUBLIC_ADSENSE_CLIENT=$NEXT_PUBLIC_ADSENSE_CLIENT \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
# npm hoists only part of the tree; workspace-local packages (next, jest-dom, ...) live here
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY package.json package-lock.json ./
COPY apps/web ./apps/web
COPY packages/shared-types ./packages/shared-types

RUN npm run build -w apps/web

# ---------- production ----------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 cricapp && \
    useradd --system --uid 1001 --gid cricapp cricapp

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/web ./apps/web
COPY --from=builder /app/packages/shared-types ./packages/shared-types
COPY --from=builder /app/package.json ./

RUN chown -R cricapp:cricapp /app
USER cricapp

EXPOSE 3000

# Render sets PORT; next start honours it.
CMD ["sh", "-c", "npm run start -w apps/web -- -p ${PORT:-3000}"]
