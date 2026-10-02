# Changes by Umair

**Date:** 2026-10-02 · **Branch:** `fix/site-ui-changes` · **Base:** `48b8d61` (backend commit `8b9e6b0`)

Two jobs: take the backend work that was still open and finish it, then map the frontend onto it. Everything below was run against a live Postgres/Redis via Docker, not reasoned about on paper.

**Everything green:** `apps/api` typecheck + lint (0 errors) + 15/15 matches tests · `apps/web` typecheck + lint (0 errors) + 1735/1735 tests + build.

---

# PART 1 — Backend

## 1.1 §6 Matches ordering — **fixed**

`apps/api/src/matches/matches.service.ts`, `dto/list-matches.query.ts`, `matches.controller.ts`

The list was `orderBy: [{ scheduled: 'asc' }]`. A finished match from 2020 sorts before anything yet to be played, so `/matches` opened on results from six years ago. Flipping to `DESC` was not the answer either — that opens on old *results*, which is equally wrong.

One order, defined once and used by both the list and the search:

```sql
ORDER BY
  CASE status WHEN 'live' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END ASC,
  CASE WHEN status IN ('live', 'upcoming') THEN scheduled END ASC NULLS LAST,
  scheduled DESC NULLS LAST,
  match_id ASC
```

- **live** → **upcoming, soonest first** → **everything else, newest first**
- `match_id ASC` is load-bearing, not decoration. Without a total tiebreak two rows can share a status and a start time, and an unstable order makes `LIMIT`/`OFFSET` show one row twice and skip another. Verified across three pages — no repeat, no gap.
- `NULLS LAST` on the `DESC` key because Postgres defaults `DESC` to `NULLS FIRST`, which would put unscheduled fixtures at the top.

**`listLive()` left on `scheduled ASC`, deliberately.** Every row there shares one status, so the status grouping would collapse to a constant and do nothing; the only meaningful order for in-play matches is by start time. Added the `matchId` tiebreak for determinism. This was the "decision rather than an accident" the handoff asked for.

## 1.2 `?tournamentId=` — **new exact filter**

The only way a series can be identified is by name, and the name filter is `ILIKE '%name%'`. "Global T20 Canada" also matches "Global T20 Canada 2024". Now there is an exact filter on `tournament_id`.

```ts
tournamentIdClause = params.tournamentId
  ? Prisma.sql`AND tournament_id = ${params.tournamentId}`
  : Prisma.empty;
```

Added to `ListMatchesQuery`. This **had** to be added there: the controller runs `ValidationPipe({ whitelist: true })`, which silently strips any query property not declared on the DTO. Without it the parameter would have been accepted and ignored.

## 1.3 Pre-existing bug found and fixed — `search()` returned blank rows

Not caused by this work, but proven while testing 1.1, and it was in the code being changed.

`search()` did `SELECT * FROM matches` in a raw query and passed the rows straight to `toSummary(r)`, which reads `r.matchId`, `r.teamNames`, `r.tournamentId`. **Prisma's `$queryRaw` does not map `snake_case` columns to the Prisma field names.** Verified against the live DB:

```
raw row    has matchId? false | has match_id? true
prisma row has matchId? true
```

So `GET /matches?q=` was returning correctly-shaped responses with `matchId`, `teams`, `teamNames` and `tournamentId` all `undefined` — a page of blanks that looks like missing data rather than like a bug.

Fixed with a regression test that asserts every summary field is populated.

## 1.4 Why the order query is raw SQL, and why it is small

Prisma's `orderBy` **cannot express a `CASE`**, so the ordering has to be written by hand — raw SQL is unavoidable here. What is avoidable is letting raw SQL return the *rows*. So only the ordering is raw:

```ts
const idRows = await this.prisma.$queryRaw<Array<{ match_id: string }>>(Prisma.sql`
  SELECT match_id FROM matches WHERE TRUE ${statusClause} ${tournamentClause} ${tournamentIdClause}
  ${MATCH_LIST_ORDER} LIMIT ${limit} OFFSET ${skip}`);

const rows = await this.prisma.match.findMany({ where: { matchId: { in: order } } });
const byId = new Map(rows.map((r) => [r.matchId, r]));
const ordered = order.map((id) => byId.get(id)).filter(Boolean);
```

The raw query returns **one column, named by us**. Prisma reads the rows, so its own field mapping applies and the 1.3 class of bug cannot happen here.

### SQL injection: no

`Prisma.sql` is a tagged template. Every interpolated value becomes a bound parameter (`$1`, `$2`, …) — never string concatenation. Tested against the running DB:

| Input | Result |
|---|---|
| `tournamentId = '; DROP TABLE matches; --` | 0 rows, **table intact, 1513 rows still there** |
| `tournament = "%' OR '1'='1"` | 0 rows — no `OR` injection |

Also locked in as an HTTP-level test (`treats a quote in the value as text, not as SQL`).

The one honest caveat: `?tournament=foo` is now `%foo%` inside a bound parameter. A user typing `%` gets a broader match. That is a wildcard in a search box, not an injection, and `search()` has always behaved that way.

### Effect on other services: none

- The change is entirely inside `apps/api`. `services/ingestion` only writes rows; it never reads order.
- The web app does **no client-side sorting** of the match list (verified — no `.sort()` in `app/matches/page.tsx`), so it inherits the new order for free.
- Redis untouched. `listLive()`'s live-set behaviour unchanged.
- One extra query per list call (ids, then rows). Negligible for a ≤100-row page.

### Performance note

A `CASE` sort cannot use a plain btree index on `scheduled`, so this sorts then limits instead of walking an index. On 1,553 rows that is nothing. If the table grows a lot, an expression index on the same `CASE` would restore it. Flagging, not doing.

## 1.5 Backend tests added

`apps/api/src/matches/matches.spec.ts` — 12 → 15 files-worth of assertions, 4 → 15 tests:

- live first, then soonest fixture, then newest result — the exact rule, asserted as one ordered array
- pagination never repeats or skips across three pages
- search uses the same order
- **summaries are fully populated, not rows of `undefined`** (regression test for 1.3)
- `tournamentId` matches one competition exactly, returns all its fixtures, returns empty for an unknown id
- a name that is a prefix of another does not bleed across competitions
- injection attempt is inert

---

# PART 2 — Frontend

## 2.1 `?tournamentId=` now used for the series rail

`services/matches.ts`, `queries/useMatchCentreQueries.ts`, `components/boards/MatchDetailBody.tsx`, `components/boards/match/OtherMatches.tsx`

`useSeriesMatchesQuery` takes `{ id, name }` and prefers the id:

```ts
const filter = id ? { tournamentId: id } : name ? { tournament: name } : null;
```

Falls back to the name when there is no id, so nothing breaks for a match whose `tournament_id` has not been written.

`OtherMatches` gains `currentTournamentId`. When set, the client-side name comparison is skipped — the API already returned exactly one competition, so re-comparing names could only drop a row that genuinely belongs.

Worth being straight about: that loose name comparison was **not** a bug I fixed. It matches names in both directions on purpose so "Global T20" and "Global T20 Canada" read as one competition — and that leniency is exactly why it cannot separate "Global T20 Canada" from "Global T20 Canada 2024". The id is the fix; the guard stays as the fallback path.

## 2.2 Earlier round, same branch — the three mapping gaps

| File | Change |
|---|---|
| `lib/matchViewModel.ts` | `tournamentId` falls back to `row.tournamentId`. The **name** fell back to the match row; the **id** did not, so on any match without a stored timeline — every upcoming fixture — the breadcrumb and Match Info rendered a plain name with no link, while the id sat unused in the response. One line. |
| `types/odds.ts` | `ModelVsMarket` gains `stage`, `preMatchHomeWinProb/AwayWinProb`, `liveHomeWinProb/AwayWinProb`. **All optional** — against a deployment predating `8b9e6b0` the panel must keep rendering one flat number, not break on a missing key. |
| `components/odds/MatchOddsView.tsx` | The panel shows a `Live` / `Pre-match` badge and matching wording. `8b9e6b0` made the live run win over the pre-match run, which is right but means the same heading silently carries two meanings. `stageLabel` returns null for an unknown stage so the heading stays plain rather than claiming one. |
| `lib/matchCentreData.ts` | The squad fill was writing `id: ''` for every player it took from the scorecard — throwing away a real provider id. On a match with no lineup, the entire Playing XI rendered as plain text. |

---

# PART 3 — §3.3 answered

**The question was:** is `batting_params.striker.id` present in the stored timeline?

**Yes. 29 of 29 ball/wicket events in a captured live payload carry it**, along with `bowler.id`, `non_striker.id`, `dismissal_params.player.id`, `bowler_id` and `fielder_id`:

```json
"batting_params": { "striker": { "id": "sr:player:1097864", "name": "Gill, Shubman" }, ... },
"bowling_params": { "bowler":  { "id": "sr:player:1969145", "name": "Seales, Jayden" }, ... }
"dismissal_params": { "player": { "id": "sr:player:643154" }, "dismissal_details": {
    "type": "caught", "bowler_id": "sr:player:2549267", "fielder_id": "sr:player:1344854" } }
```

**So §3.3 needs no ingestion change and no API change. It is already done.** Both sides already parse it — `components/MatchTimeline.tsx:105-116` (`pickId`) and `lib/matchScorecardData.ts:170,192` (`statistics.*.teams[].players[].id`) — and every scorecard surface already wraps names in `PlayerLink`, which degrades to plain text when the id is absent.

The only thing standing between this and working links is whether the `players` table has a row for each id, so `/players/sr:player:1097864` resolves instead of 404ing. That is a data-population question, not code.

---

# PART 4 — Data problems found while verifying (not fixed)

Both are ingestion issues, not API issues. Reporting rather than silently patching, because both would need the ingestion service touched.

## 4.1 19 `upcoming` matches have a start time in the past

Oldest is `2026-08-03`, two months ago. Under the new order these sort **first** — so `/matches` opens on fixtures that should have finished, just with a different set of them than before.

The ordering is correct per spec; the *status* is stale. Nothing is re-checking whether these ever started. Worth a look at whether `saveMatch`'s status guard is holding `upcoming` too tightly:

```js
status = CASE
  WHEN matches.status IN ('live', 'completed', 'cancelled') AND EXCLUDED.status = 'upcoming'
  THEN matches.status
  ELSE EXCLUDED.status
END
```

`upcoming` is not in that list, so a stale `upcoming` row should be overwritable — meaning these are simply not being re-polled.

## 4.2 `tournament_id` is populated on 169 of 1,552 rows

The migration added the column; existing rows are `NULL`. Until ingestion re-writes them, `?tournamentId=` returns nothing for those matches — which is exactly why the frontend keeps the name fallback in 2.1. **A backfill is needed before the id filter is useful on existing data.**

## 4.3 Still open from the handoff, untouched

- **`requiredRuns: 1`** (§5.1) — the job that writes the `live` prediction stage is still unidentified.
- **`oversBalls` is misnamed** — the value is `10.1` (cricket notation), the name implies 61 balls. Rename to `oversNumeric` or drop it. The frontend never uses it and does not need it.
- **`runRate` backfill** — the derivation fix is ingestion-side, so already-stored rows keep the wrong value.
- **`storedUpdatedAt` was never returned** (§2's optional item). `MatchTimelineDto` still carries only `matchId` and `payload`, so a client cannot see how old the commentary is without diffing it against the header. Low priority.
- **Swagger DTO** — `TeamSideScoreDto` still lacks `id` / `oversBalls`; `MatchSummaryDto` lacks `tournamentId`. Docs only, no runtime effect.
- **`store.js:30`** — the new `tournament_id = COALESCE(...)` line is indented 6 spaces where its siblings use 7. Cosmetic.
- **`services/ingestion/data/init.sql`** — the bootstrap `CREATE TABLE matches` still has no `tournament_id` column. Harmless today because the Prisma migration uses `ADD COLUMN IF NOT EXISTS`, but a fresh database bootstrapped from `init.sql` alone depends on that migration running afterwards. The two files now disagree.

---

# PART 5 — Record: what `8b9e6b0` actually delivered

Kept so the handover record survives this file replacing the full audit. Commit `8b9e6b0` ("Enhance match and tournament data handling with new fields and metrics integration", NP5555, 2026-10-02) was measured against `docs/HANDOFF-backend.md`.

| Handoff § | Asked for | Delivered |
|---|---|---|
| 2 | Log + counter when a live timeline refresh is skipped | **Yes** — API (`logStaleNotRefreshed`) and the ingestion snapshot path |
| 2 | `storedUpdatedAt` / `payloadGeneratedAt` (optional) | No |
| 3.1 | `teams.home.id` / `teams.away.id` | **Yes** — and written into `teams`, not only `teamScores`, which is what the frontend already reads |
| 3.2 | `tournamentId` | **Yes** — schema, migration, ingestion, API |
| 3.3 | Player ids on scorecard / squad rows | No — and no answer to the question, though none is needed: see PART 3 |
| 4.1 | `runRate` derived from `runs`/`overs` | **Yes**, ingestion only — stored rows keep the old value |
| 4.2 | `displayScore` in the enrichment copy list | **Yes** |
| 4.3 | `teams.*.overs` ball count | Partly — `oversBalls` added, but the value is overs notation, not balls |
| 5.1 | Live `requiredRuns: 1` | No |
| 5.2 | Odds panel preferred the pre-match run | **Yes** — plus a `stage` field, which needed the frontend work in 2.2 |
| 6 | Status-aware ordering | No — PART 1.1 |

**7 of 9 delivered.** Everything delivered was compatible with the web app and needed no change to avoid breaking it. The three that were not are the three that mattered most for links and for ordering.

---

# Files changed

**Backend (4)** — `apps/api/src/matches/matches.service.ts`, `dto/list-matches.query.ts`, `matches.controller.ts`, `matches.spec.ts`

**Frontend (12)** — `services/matches.ts`, `queries/useMatchCentreQueries.ts`, `components/boards/MatchDetailBody.tsx`, `components/boards/match/OtherMatches.tsx`, `lib/matchViewModel.ts`, `lib/matchCentreData.ts`, `types/odds.ts`, `components/odds/MatchOddsView.tsx`, and 4 test files