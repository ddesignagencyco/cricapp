# @cricapp/shared-types

Canonical match contract (`CanonicalMatch`, `CurrentInnings`, `LastEvent`, `MatchEvent`) plus `PROVIDERS`, `MATCH_STATUS`, `EVENT_TYPES`, `redisKeys`, and `REDIS_TTL`.

JS source of truth: `src/schema.js` and `src/redis.js`. TypeScript mirror: `src/index.ts`. Ingestion and the API must use these key helpers so they never drift on Redis layout.
