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

## Verified 2026-11-09 (real key)
- cricbuzz-cricket, cricbuzz-cricket2, unofficial-cricbuzz and cricbuzz-live1 all answer with real data.
- Free-tier limits seen in response headers: cricbuzz-cricket 200, cricbuzz-cricket2 100, cricbuzz-live1 100, unofficial-cricbuzz 500. BASIC plans also enforce ~1 call/second (429 "per second").
- cricbuzz-cricket2 serves the same endpoints and JSON shape as cricbuzz-cricket (drop-in via `RAPIDAPI_CRICBUZZ_HOST`).
- The real `mcenter/v1/{id}/scard` shape differs from the first assumption (lowercase keys, no match header, no team ids). `toSummary(info, scard)` now combines the list entry with the scorecard. Fixtures in `test/fixtures/cricbuzz/` are recorded responses.
- cricbuzz-cricket2 is wired as a second quota pool (same adapter, own budget, shared response cache).
- cricbuzz-live1 is adapted for the ball-by-ball timeline (+delta), PSL 2026 standings, squads and tournament teams (`providers/live1.js`, ids `lv:*`). Its commentary feed mixes record kinds: `ball` is every delivery, `wicketWidget` (id+1) carries the dismissal and is merged, per-ball `runs` is the total including extras and sums exactly to the innings total. A `cb:match` id is mapped to its live1 match by team pair + start time (memoised). PSL 2024/2025 do not exist upstream and are refused.
- The generated timeline was run through the web app's own `parseTimelineEvents` / `countCommentary`: 124 deliveries, 120 legal balls, 10 wickets, runs 130 (matches the real innings).

## Known risks / unverified
- Toss is parsed from the scorecard status text ("X opt to bowl") because the endpoint has no toss block; it is absent until the toss is announced in that text.
- Home/away is assigned by batting order in the adapter (the normalizer's period-score logic assumes the second innings is "away"). Multi-innings Tests are approximate.
- Highlightly adapter not implemented.
- live1 free plan is 100 requests; a commentary page is ~400 KB and a live timeline refresh costs one request per cache TTL (60 s) per match, so live ball-by-ball cannot be sustained on the free plan. Standings/squads are cached 6 h.
- Lineups, player/team profiles and head-to-head still have no RapidAPI source here.

## Reference data (added 2026-11-09)
`providers/cricbuzzu.js` (unofficial-cricbuzz, 500 req/month) fills what the live Cricbuzz hosts lack, with `cb:*` ids shared with live matches:
- tournament catalogue (`series/list` + `list-archives`, 4 categories → 4 tours via the existing `backfillTours`) plus the app's own PSL tournament row (`sr:tournament:14931`, needed as the parent of its seasons);
- PSL 2024/2025/2026 (Cricbuzz series 7492 / 11372 / 11537): fixtures, standings, 11 leader categories, squads, tournament results;
- 2025 has no upstream points table, so standings are derived from league-stage results. Checked against the official tables: 2026 matches exactly (points, record, NRR to 3 dp); 2024 matches on points, record and order but NRR differs for two teams (rain-reduced games);
- team logos and player photos from `static.cricbuzz.com/a/img/v1/152x152/i1/c{imageId}/i.jpg` (public, no quota).
The web scorecard reads `statistics.innings[]` and `sport_event.competitors` from the *timeline* payload, so the live1 timeline for a `cb:` match carries a scorecard built from Cricbuzz's `scard` response (cached from the summary poll); matches live1 does not list get a scorecard-only payload. Checked against the web app's own `readProviderInningsCards`.

## Testing
Node test runner, no network and no quota: mocked `fetch`, in-memory cache store, fixtures. Covers state mapping, SR-shape output through `normalizeMatch`, cache hit, budget block, and facade fallback.
