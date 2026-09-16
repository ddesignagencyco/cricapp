# Live score without refresh — short change log

Socket was connected, but the UI still needed an 8s HTTP poll (or a full page refresh) because ingestion only **SET** Redis cache. Socket.IO listens to Redis **PUBLISH**. Overs-only updates also produced no thin `runs`/`wicket` event, so the channel stayed silent.

Polling is removed. The live score now comes from a full match snapshot on the Redis pub/sub channel.

## Files

| File | Why |
| --- | --- |
| `services/ingestion/src/store.js` | `publishMatchState` still SETs cache for REST. When `broadcast: true`, it also **PUBLISH**es the full CanonicalMatch on `match:{id}`. SET does not notify Socket.IO. |
| `services/ingestion/src/diff.js` | Added `hasMatchChanged()`. Thin `diffMatch` events skip overs-only changes; this flag is true whenever score, overs, status, or last-ball change. |
| `services/ingestion/src/poll.js` | After each live summary, if the snapshot changed, broadcast it. Thin events (`runs`, `wicket`, …) still PUBLISH for notifications. |
| `services/ingestion/src/index.js` | Export `hasMatchChanged`. |
| `services/ingestion/test/diff.test.js` | Overs-only: no thin event; `hasMatchChanged` is true. |
| `apps/api/src/live/live.service.ts` | `PSUBSCRIBE match:*` so every published snapshot reaches Socket.IO immediately (`live:update` / `match:update`). No 30s wait for a new live match. |
| `apps/web/src/hooks/useMatchStream.ts` | Removed the 8s `fetchLiveMatches` / `fetchMatchById` poll. UI applies the socket snapshot. Thin events can still trigger one REST refetch as a backup. |

## Flow

Sportradar poll → Postgres upsert → Redis SET (REST) → Redis PUBLISH snapshot → API psubscribe → Socket.IO → web (no page refresh, no 8s poll).

## Restart

Restart **ingestion** and **API** so the publish + psubscribe code is loaded. Web hot-reloads the hook.
