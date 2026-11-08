# RapidAPI provider migration (ingestion)

Status: approved to proceed autonomously by the product owner (2026-11-08).

## Goal
Run the ingestion pipeline on RapidAPI cricket data while the SportsRadar key is pending, on **free tiers**, without breaking or deleting the SportsRadar path.

## Decisions (from the owner)
- Targets: **Cricbuzz Cricket (cricketapilive, RapidAPI)** as primary, **Highlightly** as fallback ("both, with a fallback").
- IDs: new namespaces (`cb:match:123`, `cb:team:…`, `cb:player:…`, `cb:tournament:…`); existing `sr:*` rows are kept untouched.
- Free tier first: Cricbuzz Basic = 200 req/month hard cap; Highlightly Basic = 100 req/day.

## Approach: adapters emit SportsRadar-shaped JSON
`normalizeSportradar`, the store, the web app and the prediction service keep reading one shape. Each RapidAPI adapter converts provider responses into that shape. A clean provider-neutral schema (one normalizer per provider) is deferred.

## Structure
`services/ingestion/src/providers/`
- `index.js` — facade exporting the same function names as `sportradar.js`; picks providers from `DATA_PROVIDER` (`sportradar` default | `cricbuzz` | `highlightly` | `auto` = cricbuzz then highlightly). Falls back along the chain on quota/auth/error/unsupported.
- `rapidHttp.js` — RapidAPI GET with Redis response cache (TTL per endpoint) and a request budget counter (month/day) that blocks calls before the provider's cap is hit.
- `cricbuzz.js` — endpoints + pure mapping functions to SR shape.
- `highlightly.js` — slot only; response shape unverified, so it exports nothing yet and the facade treats it as "unsupported".
- `errors.js` — `QuotaExceededError`, `ProviderUnsupportedError`, `ProviderAuthError`.

`poll.js`, `refSync.js`, `pslSync.js` import from the facade instead of `sportradar.js`. Default behaviour (`DATA_PROVIDER` unset) is unchanged.

## Scope of phase 1
Supported by Cricbuzz adapter: live schedule, match summary (score, status, toss, result, winner), daily schedule, daily results.
Not supported yet (facade throws `ProviderUnsupportedError`, callers already skip failing steps): ball-by-ball timeline and deltas, lineups, team/player profiles, tournaments/seasons/standings/leaders/squads (PSL), head-to-head, odds.

## Free-tier budget
- Cache TTLs: live list and match summary 60 s (env-tunable); schedule lists 30 min.
- Budget guard: `RAPIDAPI_CRICBUZZ_MONTHLY_BUDGET` (default 200), `RAPIDAPI_HIGHLIGHTLY_DAILY_BUDGET` (default 100). Counter is incremented per real HTTP call; over budget → `QuotaExceededError` → fallback.
- Consequence: the free tier cannot sustain continuous live polling. It supports development and low-frequency demo refresh only.

## Known risks / unverified
- Cricbuzz response shapes are mapped from the provider's documented endpoints (`matches/v1/live|recent|upcoming`, `mcenter/v1/{id}/scard`) and **have not been checked against a live response** (no key available when written). Fixtures in `test/fixtures/cricbuzz/` are hand-authored to that shape and must be replaced by recorded responses (`npm run record:cricbuzz`) once a key exists.
- Home/away is assigned by batting order in the adapter (the normalizer's period-score logic assumes the second innings is "away"). Multi-innings Tests are approximate.
- Highlightly adapter not implemented.

## Testing
Node test runner, no network and no quota: mocked `fetch`, in-memory cache store, fixtures. Covers state mapping, SR-shape output through `normalizeMatch`, cache hit, budget block, and facade fallback.
