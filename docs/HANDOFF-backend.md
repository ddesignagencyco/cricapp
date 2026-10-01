# Backend Handoff — All Outstanding Work

**Date:** 2026-10-01 · **From:** frontend engineering · **To:** backend
**Supersedes:** `HANDOFF-timeline.md` and the earlier timeline section of the previous handoff. Those contained three claims that do not match the code; they are corrected in §1 rather than repeated.

Frontend changes are complete and shipped. Nothing here blocks the site. Every item is either a correctness fix or a small additive field.

---

## How to read this

| Section | Topic | Needs |
|---|---|---|
| 1 | **Corrections** — three previously reported claims that are wrong | Read, so the same work is not done twice |
| 2 | **Live timeline freshness** — the one real problem | One log line + one counter |
| 3 | **Missing IDs** — blocks every internal link on the site | 3 fields added to existing responses |
| 4 | **Fields that disagree with each other** | 3 fixes |
| 5 | **Predictions** | 2 fixes |
| 6 | **Matches ordering** | A decision, then a query |
| 7 | **Second ad network** — who does what | Frontend owns it; two things needed from you |
| 8 | **What is explicitly not being asked |  |

Everything in §1–§6 was verified by reading the source and calling the running API. Where something could not be verified at runtime it says so.

---

# 1. Corrections to the earlier report

Three claims were reported that the source contradicts. They matter because the work they propose is already running.

### 1.1 `LIVE_TIMELINE_SNAPSHOT_EVERY` defaults to **3**, not 0

`services/ingestion/src/poll.js:23-25`
```js
const TIMELINE_SNAPSHOT_EVERY = Number(
  process.env.LIVE_TIMELINE_SNAPSHOT_EVERY ?? 3,     // 0 nahi
);
```
`poll.js:67-73` runs on every live poll and performs a full `timeline.json` fetch + upsert on every third call. At `POLL_INTERVAL_LIVE_MS=45000` that is roughly every **135 seconds of live play**. It is on by default today.

### 1.2 Live matches are deliberately **excluded** from the 365-day one-shot queue

`services/ingestion/src/store.js:753`, `listEventIdsWithoutTimeline()`:
```sql
WHERE mt.match_id IS NULL
AND (m.match_id IS NULL OR m.status NOT IN ('live', 'upcoming'))
```
Live and upcoming never enter that queue. They have a separate cadence: `services/ingestion/src/refState.js:31` → `liveTimeline: 5 * 60e3`, consumed at `refSync.js:582`.

### 1.3 The API does refresh an existing row

`apps/api/src/matches/matches.service.ts:318-339` fetches and upserts when `isLiveTimelineBehindMatch(...)` says the row is behind. The staleness rule is `apps/api/src/matches/timeline-stale.util.ts:51`, and it only reports stale while `status === 'live'`.

**So two independent live refresh paths exist. A match was still reported frozen. The problem is therefore not a missing mechanism — it is a refresh that silently did not run. That is §2.**

---

# 2. Live timeline freshness — the one real problem

## What was reported

`sr:match:67132180` (England vs Sri Lanka): header showed `93/2 in 15.4 ov` while the timeline held 25 events ending at `3.3 / 16/1`.

**Could not be re-verified.** That match finished during this review and now returns 537 events and `176/10 @ 36.6`, which agrees with its summary. No live match was in progress. The diagnosis below is from source, not from reproducing the freeze.

## The defect

`apps/api/src/matches/matches.service.ts:333-340`

```ts
try {
  const fresh = await this.sportradar.fetchMatchTimeline(matchId);
  return this.upsertTimelinePayload(matchId, fresh);
} catch (err) {
  if (err instanceof ServiceUnavailableException) throw err;
  // ↑ 404, network failure, shape error, throttling — all discarded here.
  //   No log, no counter, no signal.
}
return { matchId: row!.matchId, payload: storedPayload };
// ↑ caller gets 200 with stale data, indistinguishable from current
```

A refresh can fail for any reason and the caller cannot tell. With two refresh paths and neither instrumented, there is no way to know which one was skipped or why.

## The fix

One log line and one counter. **No retry loop, no architecture change.**

When `stale === true` and no refresh happened, record why:

| reason | meaning |
|---|---|
| `not_configured` | `sportradar.isConfigured` was false |
| `too_recent` | the 30s age floor had not elapsed |
| `fetch_failed` | the upstream call threw |

```ts
logger.warn('timeline stale, not refreshed', { matchId, reason, ageMs, storedOvers, matchOvers });
// counter: timeline_stale_not_refreshed_total{reason}
```

Also worth adding, and cheap: the same signal in `services/ingestion/src/poll.js:67-73` for the snapshot path, so both paths are visible.

## Optional but useful

Return the age of the stored row so a client can see how old the commentary is without comparing it to the header:

```
storedUpdatedAt     — match_timelines.updatedAt
payloadGeneratedAt  — payload.generated_at (already present)
```

## Also not needed

The earlier report's "stop treating live matches as one-shot" and "refresh in getTimeline" asks are already satisfied — see §1.1–1.3.

---

# 3. Missing IDs — this is what blocks every internal link

The site has a complete link layer ready: `apps/web/src/components/EntityLinks.tsx` with `TeamLink`, `PlayerLink`, `TournamentLink`, and a guard that refuses to build `/teams/undefined`. It is fully tested.

**Nothing renders as a link, because the IDs are not in the API responses.** A name only becomes a link when there is a real ID behind it; a guessed slug would produce a dead link, which is worse than plain text.

## Verified responses

```
GET /api/matches/:id
  teams.home      { code, name, score, overs }      ← no id
  teams.away      { code, name, score, overs }      ← no id
  tournamentId    ""                                 ← empty
  tournament      "Global T20 Canada"                ← name only

GET /api/teams
  id  "sr:competitor:951737"                        ← the ID exists here
```

## The three fields needed

| # | Add | Where | Unblocks |
|---|---|---|---|
| 1 | `teams.home.id` / `teams.away.id` | `apps/api/src/matches/matches.service.ts` — `buildTeamsField` (line 62) | Team names in the match header, the logo, and the Match Info rows |
| 2 | `tournamentId` | same `toSummary` (line 85) | Tournament name in the match header and Match Info |
| 3 | `id` on scorecard and squad rows | `services/ingestion` normalisation, or the API mapping layer | Every batter, bowler and squad player linking to their profile |

For #3, the frontend already reads the provider IDs — `batsmanId`, `bowlerId` were being parsed and then discarded in `apps/web/src/lib/matchCentreData.ts`. Those are internal to the web app and already work once the payload reaches them. **Please confirm whether Sportradar's `batting_params.striker.id` and `bowling_params.bowler.id` are present in the stored timeline** — if they are, §3 needs no ingestion change at all.

## Note

`TeamLogo` in the web app links to `/teams/${teamId}` with the raw colon preserved, matching the existing `/matches/${matchId}` and `/players/${id}` convention. A single ID format across endpoints will avoid a second round of this.

---

# 4. Fields that disagree with each other

## 4.1 `currentInnings.runRate` contradicts its own runs and overs — **high**

Measured on one live response:

```
currentInnings.runs     314
currentInners.overs     30.4
currentInnings.runRate  10.18      ← 314 from 30.4 overs is 10.35
```

`runRate` is written by a different path than `runs` and `overs`, so it lags. A reader cannot tell it is stale, because a bare decimal looks authoritative. It produced `306/1 · RR 10.14` and `307/1 · RR 10.14` on two cards at the same moment.

**Fix:** compute it from `runs` and `overs` at write time, in the same place, so the three cannot disagree.

## 4.2 `displayScore` is never repaired — **high**

`matches.service.ts:131-140` copies six fields from the stored Sportradar summary — `winnerId`, `tossWonBy`, `tossDecision`, `currentInning`, `periodScores`, `displayOvers` — but **not** `displayScore`, even though `sportEventStatusFromPayload` parses it (`sport-event-status.util.ts:47`).

So enrichment repairs `teamScores` and `displayOvers` while leaving `displayScore` stale. A consumer reading `displayScore` gets old data while one reading `teamScores` gets current data, at the same instant.

**Fix:** add `displayScore: statusView.displayScore ?? undefined` to that object, or derive it from `teamScores` so the two cannot diverge.

## 4.3 `teams.*.overs` is rounded to whole overs — **medium**

```
displayOvers     10.1
teams.home.overs "10"
```

Two different ball counts for the same innings. This was the root cause of a visible bug: the homepage card read `9 ov` while the match page read `9.4 ov`.

**Fix, pick one:**
- **(a) Preferred** — return the ball count as a number in `teams.*.overs` (`10.1`), consistent with `displayOvers`.
- **(b)** Add a sibling `teams.*.oversBalls` and document `overs` as display-only.

(a) is breaking for existing consumers, so please coordinate.

---

# 5. Predictions

## 5.1 Live runs report `requiredRuns: 1` — **high**

`GET /api/predictions/sr:match:71040584` returned, for a chase of 405 with India on 271/1:

```json
"explanation": {
  "requiredRuns": 1,          ← should be 135
  "remainingBalls": 133,
  "requiredRunRate": 6.14,    ← implies ≈135
  "resourcesLeft": 0.46       ← 135 of 300 balls
},
"scoreRange": { "low": 271, "high": 281, "expected": 272 }
```

Every other field is computed from ≈135. `requiredRuns` is the odd one out, and the chase-total band is anchored to the current score instead of the target. The resulting `homeWinProb: 0.9633` is defensible for that scoreline but reached through wrong inputs, and on a closer match the same defect inverts.

**Where it is written is not in this repository.** `predictions.service.ts` only reads the stored values (`row.result.homeWinProb` at lines 59, 372, 423). The `home_win_prob` column is `prisma/schema.prisma:602`, and nothing in `apps/api` or `scripts/` writes it. **Please identify the job that writes the `live` stage run and confirm whether the target is unset, which would explain the `1`.**

## 5.2 The odds panel prefers the pre-match run — **medium**

`apps/api/src/odds/odds.service.ts:354-355`
```ts
homeWinProb: pred?.preMatch?.homeWinProb ?? pred?.live?.homeWinProb ?? null,
```
`??` is nullish, so `preMatch` always wins when both exist. On a live match the odds page's "Our prediction" shows the **pre-match** number next to **live** prices. For the fixture above that panel read 50% while the predictions page read 96.3%.

**Fix:** reverse the order, or return both stages plus a `stage` field so the client can label the number honestly.

---

# 6. Matches ordering

`matches.service.ts:165` (list) and `:230` (live) both use:
```ts
orderBy: [{ scheduled: 'asc' }],
```
Confirmed live: `GET /api/matches?limit=6` returns 2023-07-21, 07-22, 07-23, 07-26… so a reader opens the matches page on fixtures from two years ago.

**A bare flip to `DESC` trades one wrong order for another** — completed matches would come first and the default view would open on finished results. Status-aware ordering is needed:

```sql
ORDER BY
  CASE status WHEN 'live' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END,
  CASE WHEN status <> 'completed' THEN scheduled END ASC,
  scheduled DESC
```

Live now → soonest fixtures → everything else newest first. It also removes the need to guess where a null `scheduled` sorts.

**Needed from you before implementing:** confirm the status precedence, and whether `listLive()` at line 230 should change at all — it has few rows at a time, so the sort barely matters there, but it should be a decision rather than an accident.

---

# 7. Second ad network

Requested: serve ads from other networks (Adsterra, Ezoic, PropellerAds, InfoLinks were named) until AdSense is approved.

## Who does what

**This is frontend work and stays frontend.** The web app already has a provider-shaped ad layer, so a second network is a new adapter, not a rewrite:

```
apps/web/src/lib/advertisements/registry.ts
    AD_MODES = ['off', 'house', 'adsense']      ← a new mode goes here
apps/web/src/components/advertisements/
    AdProvider.tsx    injects the AdSense tag once per document
    AdSlot.tsx        renders a placement
apps/api/src/adsense/                            reports and settings
```

**Please do not start backend work on this from this handoff.** It will be scoped separately. Nothing in `apps/api` needs to change to serve a second network.

## Two things that would help, if cheap

1. **A decision on category policy, before any provider is wired up.** The networks named restrict or ban betting-weighted sportsbook inventory, and a cricket site is exactly that category. An account approved for general display and then found serving a cricket site can be terminated quickly. Worth confirming per network before integrating, not after.
2. **A click/impression counter per placement.** The API has AdSense report metrics but nothing placement-level, so if a second network is added there will be no way to compare providers. `share_stats` already records share clicks for gallery items, so the pattern exists. Optional, but it is the only way to decide which network to keep.

---

# 8. Explicitly not being asked

- ❌ Do not fabricate commentary in the web app. The frontend renders the stored payload and never invents a ball.
- ❌ Do not change web files. The one exception: if a timeline payload key moves, say so and we will follow.
- ❌ Do not change `LIVE_TIMELINE_DELTAS`. It is off and should stay off — see below.

## Delta timeline API

Already implemented on both sides, gated by one flag (`poll.js:21`, `LIVE_TIMELINE_DELTAS === 'true'`). Local `.env` has it `false`. **Leave it off.**

The buffer is written but never merged: `captureLiveTimelineDelta` (`poll.js:42-55`) pushes into a Redis list and nothing copies it into `match_timelines`. So turning it on today would mean the first full snapshot reaches the commentary and the new balls never do — and at `poll.js:98-102` `clearLiveTimelineState` deletes the buffer when the match ends, so the final innings would be discarded rather than written.

Delta is a bandwidth optimisation with a bandwidth motivation we do not have: at `SPORTRADAR_QPS=1` the provider throttles bulk fetching long before payload size matters. Adopting it later needs three prerequisites, not follow-ups:

1. Every delta durably merged **before** the cursor advances.
2. A periodic full snapshot as a repair job, so any divergence self-heals.
3. A gap detector — non-contiguous sequences force a full re-sync and log it. A hole must be loud; being late is visible, a hole is not.

If the goal is only to reduce bytes, raising `LIVE_TIMELINE_SNAPSHOT_EVERY` is the cheaper first step: less freshness, but no state and no way to create a hole.

## Soft 404s on entity news pages — a frontend note, not backend work

`/news/by/[type]/[id]` rejects an unknown `type` with `notFound()`. In this Next.js version that response is a **soft 404**: HTTP `200` carrying `<meta name="robots" content="noindex">`, because `app/news/loading.tsx` starts streaming before the page body runs and the status can no longer be changed.

This is app-wide existing behaviour, not something the new page introduced — verified against the routes that predate it:

| URL | Status | `robots` |
|---|---|---|
| `/news/definitely-not-a-real-id` (pre-existing) | 200 | `noindex` |
| `/matches/definitely-not-a-real-id` (pre-existing) | 200 | `noindex` |
| `/news/by/bogus/x` (new) | 200 | `noindex` |
| `/news/by/match/sr:match:71040584` (new, valid) | 200 | — |

Nothing to fix unless a hard `404` is wanted for compliance or analytics reporting, which would mean moving the `type` check into `proxy`. Leaving it alone: `noindex` is the documented mitigation and it already keeps these URLs out of the index.

---

# 9. Priority

| # | Item | Effort | Unblocks |
|---|---|---|---|
| 1 | Log + counter on a skipped timeline refresh (§2) | ~10 lines | Diagnosing every future timeline report |
| 2 | `teams.*.id` and `tournamentId` (§3.1, §3.2) | small | **Every internal link on the site** |
| 3 | `runRate` computed from runs/overs (§4.1) | small | Wrong run rate under the score |
| 4 | `displayScore` in the enrichment copy list (§4.2) | one line | A stale score beside a current one |
| 5 | Matches ordering (§6) | small, after a decision | The matches page opening on 2023 |
| 6 | `teams.*.overs` ball count (§4.3) | small, needs coordination | Two overs for one innings |
| 7 | Player ids in scorecard/squad rows (§3.3) | depends on §3.3 answer | Batter and bowler links |
| 8 | Live prediction `requiredRuns` (§5.1) | outside this repo | Wrong chase maths |
| 9 | `buildModelVsMarket` stage order (§5.2) | one line | Pre-match number on a live match |
| — | Second ad network (§7) | frontend, separate | Live ad revenue |
| — | Delta timeline (§8) | **leave off** | Nothing today |

## Acceptance for §2

On any live match, within one snapshot interval:

1. The match summary's `displayScore` and `currentInvers.overs` equal the newest `timeline[]` item's `display_score` and `display_overs`, same innings.
2. `timeline[]` length increases during play.
3. A wicket or a four appears in `match_timelines` within one snapshot interval.
4. If a refresh does not happen, the reason appears in the logs and the counter — never a silent `200` with old data.
5. A finished match keeps its final full timeline.

```bash
# 4 minute chalao, har 30 second
watch -n 30 "curl -s http://localhost:3001/api/matches/\$ID/timeline | jq '.payload.timeline | length'"
```

**This check is the whole point of §2.** The original report would have been caught by it in five seconds, and nothing in the codebase can catch it today.
