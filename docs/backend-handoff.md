# Backend Handoff — Cricket Info Platform

**Prepared:** 2026-09-30 · **Last updated:** 2026-09-30, after the full frontend session
**Scope:** everything the backend team needs, including bugs found during frontend work, design problems, and enhancement requests.
**Frontend state:** all frontend fixes described here are shipped. Nothing below blocks the frontend; these are correctness and data-quality issues on the API side.

All file references are `apps/api/...` unless stated otherwise. Findings marked **Confirmed** were reproduced against the running local stack. Findings marked **Inference** are reasoned from code but not reproduced at runtime.

> **The single most important thing in this document** is item **#2A**, added after the last measurement. A single `GET /matches/:id` response was found returning **five different values for the same score at the same instant**. That single defect is the root cause of nearly every user-visible problem we spent this cycle fixing. It is cheap to fix and worth fixing first.

---

## Priority summary

| # | Area | Severity | Type |
|---|---|---|---|
| **2A** | **`runRate` contradicts its own runs and overs** | **Critical** | **Bug** |
| 1 | `listLive()` does not merge the Redis live state | High | Bug |
| 2 | `enrichFromStoredSummary` does not repair `displayScore` | High | Bug |
| 3 | Live model run reports `requiredRuns: 1` | High | Bug |
| 4 | Pre-match model runs with all-zero features | Medium | Bug |
| 5 | `buildModelVsMarket` prefers `preMatch` over `live` | Medium | Bug |
| 6 | `teams.*.overs` rounds to whole overs | Medium | Bug |
| 7 | No incremental timeline fetch | Medium | Enhancement |
| 8 | Match row and timeline are written separately | Medium | Design |
| 9 | No single atomic live snapshot | Medium | Design |
| 10 | Timeline coverage is not surfaced in the API | Low | Enhancement |
| 11 | Unrendered compliance fields | Low | Design |

---

# 2A. `currentInnings.runRate` contradicts its own `runs` and `overs` — **Confirmed**

Found last, and the most damaging of all, because it is the field a reader notices first and it is arithmetically self-contradictory.

A single live response was measured returning:

```json
{
  "displayScore": "310/1",
  "currentInnings": {
    "runs": 314,
    "overs": 30.4,
    "wickets": 1,
    "runRate": 10.18,
    "battingTeam": "IND"
  }
}
```

30.4 overs is 182 balls, i.e. 30.333 overs. From 314 runs that is a run rate of **10.35**, not 10.18. The `runRate` matches neither the `runs` nor the `displayScore` in the same object:

| Value in the same response | Implies a run rate of |
|---|---|
| `displayScore` 310/1 @ 30.4 | 10.22 |
| `currentInnings` 314/1 @ 30.4 | **10.35** |
| `currentInnings.runRate` 10.18 | 287 runs |

**Why it matters more than it looks.** `runRate` is written by a different path from `runs` and `overs`, so it lags them. It was the last field the frontend still read directly, and it produced this on the page:

```
Homepage card    306/1 · 30.1 ov · RR 10.14
Match page       307/1 · 30.2 ov · RR 10.14
```

The same run rate attached to two different scores, in the same line. Because the run rate is a bare decimal, a reader cannot tell it is stale — it looks authoritative. This was the hardest of the score bugs to diagnose, because the run rate was the only field that was *wrong in a way that looked correct*.

**Fix.** `runRate` should be computed from `runs` and `overs` at write time, in the same place, so the three can never disagree:

```ts
runRate: runs !== null && overs > 0 ? currentRunRate(runs, overs) : null
```

The frontend now computes it and ignores the stored value when runs and overs are available, so this is not blocking. But every consumer that trusts `runRate` is currently exposed, and the value is wrong on every live match we have looked at.

**Requested:** please confirm whether `runRate` is written by the same job as `currentInnings.runs`. If it is a separate write, that is the defect.

---

# 1. `listLive()` ignores the Redis live state — **Confirmed**

`apps/api/src/matches/matches.service.ts:226`

`getById` merges the cached live state:

```ts
// matches.service.ts:261
async getById(matchId: string): Promise<MatchSummary> {
  const [cached, row] = await Promise.all([
    this.redis.get<CanonicalMatch>(redisKeys.matchState(matchId)),   // <- read
    this.prisma.match.findUnique({ where: { matchId } }),
  ]);
  if (row) {
    ...
    if (cached) {
      return { ...cached, teams: mergedTeams, teamScores: mergedScores, result: summary.result };
    }
```

`listLive` does not:

```ts
// matches.service.ts:226
async listLive() {
  const [rows, liveIds] = await Promise.all([
    this.prisma.match.findMany({ where: { status: MATCH_STATUS.LIVE }, orderBy: [...] }),
    this.redis.smembers(redisKeys.liveMatches()),                  // <- only used to prune stale ids
  ]);
```

Redis is used at line 232 **solely to delete ids that are no longer marked live in Postgres** (lines 245–249). The cached `matchState` payload is never merged into the returned summaries.

**Effect:** `GET /matches/live` returns whatever Postgres last persisted, which can be many balls behind the live stream. `GET /matches/:id` for the same match returns fresher data. Any consumer that lists live matches — the homepage, the Live Now section, the predictions page — is reading the staler of the two paths.

**Fix:** read `redisKeys.matchState(id)` for each live row in `listLive()` and merge it the same way `getById` does. Consider extracting the merge into one private method so the two paths cannot drift apart again.

---

# 2. `displayScore` is never repaired by enrichment — **Confirmed**

`apps/api/src/matches/matches.service.ts:109`

`enrichFromStoredSummary` copies six fields from the stored Sportradar summary:

```ts
// matches.service.ts:131-140
...(statusView
  ? {
      winnerId:     statusView.winnerId     ?? undefined,
      tossWonBy:    statusView.tossWonBy    ?? undefined,
      tossDecision: statusView.tossDecision ?? undefined,
      currentInning:statusView.currentInning?? undefined,
      periodScores: statusView.periodScores ?? undefined,
      displayOvers: statusView.displayOvers ?? undefined,   // <- overs is repaired
    }
  : {}),
```

`displayScore` is absent from that list, even though `sportEventStatusFromPayload` parses it (`apps/api/src/common/sport-event-status.util.ts:47`) and `toSummary` reads it straight off the row:

```ts
// matches.service.ts:97
displayScore: row.displayScore,
```

**Effect:** the enrichment repairs `teamScores` (line 128) and `displayOvers` (line 138) but leaves `displayScore` stale. A consumer reading `displayScore` gets old data while a consumer reading `teamScores` gets current data — for the same match, at the same moment. Measured: `displayScore: "310/1"` alongside `currentInnings.runs: 314` in one response.

This surfaced as a user-visible bug: the predictions page cards rendered with no score on live matches while the homepage showed the score correctly, because the predictions card read `displayScore` and the homepage card read `teamScores`.

**Fix:** add `displayScore: statusView.displayScore ?? undefined` to the object at lines 131–140. If `displayScore` is meant to be derived rather than copied, derive it from `teamScores` + `currentInnings` instead of reading the raw column, so the two can never disagree.

---

# 3. Live prediction reports `requiredRuns: 1` — **Confirmed**

`GET /api/predictions/sr:match:71040584` returned this `live` run:

```json
{
  "stage": "live",
  "homeWinProb": 0.9633,
  "awayWinProb": 0.0367,
  "explanation": {
    "over": 27.6,
    "inning": 2,
    "wickets": 1,
    "requiredRuns": 1,
    "remainingBalls": 133,
    "requiredRunRate": 6.14,
    "resourcesLeft": 0.46,
    "parScore": 270,
    "projectedTotal": null
  },
  "scoreRange": { "low": 271, "high": 281, "type": "chase_total", "expected": 272 }
}
```

The match state at that moment: **India 271/1 chasing West Indies 405/7.**

India needs **405 − 271 + 1 = 135 runs**, not 1. Every other field is computed from a figure close to 135:

- `requiredRunRate: 6.14` → implies ≈135 runs over ≈22 overs
- `resourcesLeft: 0.46` → 135 of 300 balls, i.e. 45%
- `scoreRange: 271–281` → India 271 **+1 (the "required runs") + ~9**, rather than 271 **+135**

So `requiredRuns` is the single inconsistent field, and the chase-total band is anchored to it.

**Effect:** the win probability of 0.9633 happens to be defensible for this particular scoreline (India is 9 wickets up with 133 balls left), but it is being reached through wrong inputs. On a closer match the same defect produces an inverted probability. An earlier observation on this same match showed `homeWinProb: 0.97` on a chase that was not yet close, with a narrative that simultaneously read *"scoring rate (favours home); wickets (favours away); resources (favours away)"* — the confidence and the reasons contradicted each other.

**Where to look:** the writer is **not in this repository**. `apps/api/src/predictions/predictions.service.ts` only reads the stored values (`row.result.homeWinProb` at lines 59, 372, 423). The `home_win_prob` column is declared at `apps/api/prisma/schema.prisma:602`, but no code in `apps/api` or `scripts/` writes it. The prediction job is an external service.

**Requested:** identify the job that writes the `live` stage run and fix the runs-remaining derivation. Specifically, confirm whether `requiredRuns` is being computed as `target − currentScore + 1` with an unset/absent target, which would explain the `1`.

**Note on the writer being outside this repo** — this is worth confirming. If the job does live in another repository, please tell us; we will point the frontend's contract tests at it.

---

# 4. Pre-match model runs with all-zero features — **Confirmed**

The same match, `pre_match` run:

```json
{
  "homeWinProb": 0.5,
  "awayWinProb": 0.5,
  "confidence": 0.35,
  "explanation": {
    "z": 0, "xiEdge": 0, "h2hEdge": 0, "formEdge": 0,
    "tableEdge": 0, "venueEdge": 0, "calibratedZ": 0,
    "tossAdjusted": false, "tossDecision": null,
    "parSource": "format_default",
    "calibration": { "source": "env_default" },
    "conditionsImpact": { "runs": 0, "factors": "", "winEdge": 0 }
  },
  "topBatters": [], "topBowlers": [],
  "xi": { "home": [], "away": [], "method": "registered-squad availability heuristic", "reliability": "low" }
}
```

Every feature edge is `0`, the weight set is the default, `tossAdjusted` is `false`, both XI lists are empty, and the output is exactly 50/50.

This may be correct for a brand-new fixture with no history, but the `parSource: "format_default"` and `calibration.source: "env_default"` markers say the run fell back to defaults rather than finding that no data existed. If pre-match predictions are consistently 50/50 across fixtures, the feature pipeline is not reaching the model and this needs a look.

**Requested:** confirm whether a 50/50 output is expected here, and if not, trace why the feature edges are all zero. A response indicating *which inputs were unavailable* would be more useful than a silent default.

---

# 5. `buildModelVsMarket` prefers `preMatch` over `live` — **Confirmed**

`apps/api/src/odds/odds.service.ts:348`

```ts
homeWinProb: pred?.preMatch?.homeWinProb ?? pred?.live?.homeWinProb ?? null,
awayWinProb: pred?.preMatch?.awayWinProb ?? pred?.live?.awayWinProb ?? null,
```

The nullish coalescing puts `preMatch` **first**, so it always wins when both exist. For a live match that means the odds page's "Our prediction" panel shows the **pre-match** probability while comparing it against **live** market prices.

For the fixture above, that panel currently reads:

```
India        50.0%  vs  <live market implied>%
```

while the predictions page for the same match reads `96.3%`. Two pages, two model numbers, same match.

The frontend renders this as "Our prediction — our own estimate, next to what the prices say", so the mismatch is visible to users, not just to us.

**Fix:** reverse the order so the stage matching the match state wins:

```ts
homeWinProb: pred?.live?.homeWinProb ?? pred?.preMatch?.homeWinProb ?? null,
awayWinProb: pred?.live?.awayWinProb ?? pred?.preMatch?.awayWinProb ?? null,
```

**Better:** return both stages plus a `stage` field, and let the client label the number correctly ("pre-match" vs "in-play"). The current single-number response cannot be labelled honestly by the client, which is why the frontend currently prints an unlabelled "Our prediction".

---

# 6. `teams.*.overs` rounds to whole overs — **Confirmed**

Observed on a live fixture:

```
displayOvers   : 10.1
teams.home.overs: "10"        (string, rounded)
```

`buildTeamsField` (`apps/api/src/matches/matches.service.ts:62`) is what populates the per-team `overs` value. It drops the ball count, while `displayOvers` keeps it.

**Effect:** `teams.*.overs` and `displayOvers` describe different ball counts, so any consumer reading the former shows a different over than any consumer reading the latter. This was the root cause of a live user-facing bug where the homepage card read `9 ov` and the match page read `9.4 ov` for the same moment.

The frontend now normalises and reconciles these, so it is no longer visible, but the ambiguity will reappear for any new consumer.

**Fix, pick one:**
- **(a) Preferred:** return the ball count in `teams.*.overs` as a number (`10.1`), keeping it consistent with `displayOvers`. The existing frontend reconciliation handles this correctly.
- **(b)** Add a sibling field such as `teams.*.oversBalls` (integer) and mark `overs` as display-only in the DTO/OpenAPI description.

Option (a) is a breaking change for existing consumers, so please coordinate.

---

# 7. No incremental timeline fetch — **Enhancement request**

`GET /api/matches/:matchId/timeline` returns the **entire** timeline on every call. There is no `since`, `after`, `from`, or cursor parameter.

Measured on a live ODI in innings 2:

```
events returned : 492
payload.coverage: {"type":"sport_event","sport_event_properties":{"level":"advanced"}}
first 2 events  : type=match_started, type=period_start
last 3 events   : 26.1 255/0 · 26.2 255/1 · 26.3 255/1
```

All 492 events (the entire first and second innings) transfer on every poll, to display roughly the last dozen in the commentary list. The frontend currently refetches every 3–15 seconds during a live match, so this is the heaviest endpoint on the site per byte transferred.

**Requested:** accept an optional cursor and return only what is new.

```
GET /api/matches/:matchId/timeline?after=<lastEventId>
```

Events already carry a stable `id` (the frontend groups and dedupes on it), so a server-side `id > after` filter is straightforward. Please include a `hasMore` flag and the newest `id` in the response either way, so the client can confirm it is not silently missing events.

**Also worth considering:** a server-sent-events or long-poll feed for the timeline. The platform already has an SSE stream for the score (`apps/api/src/live/`); the timeline is the one part of a live match that is still poll-only, which is why it is the part that lags.

---

# 8. Match row and timeline are written by separate paths — **Design issue**

There are two independent write paths for the same match:

1. The **match row** (`displayScore`, `displayOvers`, `currentInnings`) — written by the live/SSE ingestion.
2. The **timeline** (`matchTimeline.payload`) — written by `upsertTimelinePayload` (`matches.service.ts:292`), refreshed on a separate 30-second floor.

`getTimeline` compensates for the divergence at read time:

```ts
// matches.service.ts:319
const stale = isLiveTimelineBehindMatch(
  { status: matchRow.status, displayScore: matchRow.displayScore, displayOvers: matchRow.displayOvers },
  storedPayload,
);
const ageMs = row ? Date.now() - row.updatedAt.getTime() : Number.POSITIVE_INFINITY;
if (stale && ageMs >= MatchesService.LIVE_TIMELINE_REFRESH_MIN_AGE_MS && this.sportradar.isConfigured) {
```

This works, but the window between the two writes is unavoidable, so for the duration of a single delivery the two endpoints can disagree. The frontend currently resolves this by comparing **ball counts** and taking whichever source is further along, and by normalising the display (`5 overs + 6 balls` renders as `6 ov`).

**Requested:** consider writing both from the same ingestion callback, so a single upstream event updates the row and the timeline together. If that is not practical, at minimum return a shared `generatedAt`/`revision` on both payloads so clients can tell which is newer without parsing scores.

---

# 9. No single atomic live snapshot — **Design request**

There is no endpoint that returns "the current state of this match" in one consistent read. A consumer must call `/matches/live` and `/matches/:id/timeline` and reconcile.

**Requested:** a single endpoint, e.g.

```
GET /api/matches/:matchId/live-state
```

returning the reconciled live fields plus the timeline cursor in one response, with a `revision` or `generatedAt` stamp. This removes an entire class of frontend bug — the platform had three surfaces showing three different overs for the same delivery before the frontend consolidated its own logic to compensate.

This is the change that would most reduce future frontend complexity. It is not urgent — the frontend works today — but it is the structural cause of the class of bugs we spent this cycle fixing.

---

# 10. Timeline coverage level is not surfaced — **Enhancement**

The provider returns a coverage marker, and it decides whether ball-by-ball data exists at all:

| Match | `payload.coverage` | Events |
|---|---|---|
| Live ODI | `{"type":"sport_event","sport_event_properties":{"level":"advanced"}}` | 492 |
| Completed match (Aug 2026) | `{"type":"sport_event"}` — no `sport_event_properties` | 0 |

Completed and older matches fall back to basic coverage, which contains only lifecycle events (`match_started`, `period_start`, `innings_break`, `match_ended`) and **no deliveries**. The commentary for such a match therefore shows 6–8 lifecycle events and no balls.

This is correct provider behaviour, not a bug. The frontend renders a minimal list for those matches, which is honest but reads as if data is missing.

**Requested:** normalise the coverage level into a top-level, documented field on the response, e.g. `coverage: "advanced" | "basic"`, so clients can show a clear message ("ball-by-ball is not available for this match") instead of a list of lifecycle events. Please do not echo the raw provider object.

---

# 11. Unrendered compliance fields — **Design note**

`OddsComplianceDto` (`apps/api/src/odds/dto/odds.dto.ts:5`) returns six fields. The frontend currently renders two:

| Field | Rendered |
|---|---|
| `ageGatingRequired` | yes |
| `disclaimer` | yes |
| `publicEnabled` | no |
| `regionAllowed` | no |
| `advertisingRestricted` | no |
| `responsibleUseMessage` | no |

`responsibleUseMessage` has a sensible default in `apps/api/src/odds/odds-compliance.util.ts:12` and is never displayed. `advertisingRestricted` in particular should gate something — currently nothing consumes it, so a restricted market would render identically to an unrestricted one.

**Please confirm the intended behaviour** for each of the four. We will render whatever is meant to be user-visible. No action needed if they are informational only, but we would rather know than guess.

---

# Verified correct — please do not spend time here

To save time, these were checked and are behaving correctly:

- **The timeline payload is well-formed.** 492 events, zero duplicate ids, correctly ordered, `generated_at` and per-event timestamps present.
- **`dedupeTimelineEvents` works.** No duplicate events were found on a live match.
- **`isLiveTimelineBehindMatch` works.** It correctly detects when the timeline lags the match row.
- **The 30-second upstream floor is sound.** `LIVE_TIMELINE_REFRESH_MIN_AGE_MS` (`matches.service.ts:290`) is a reasonable guard against hammering the provider and does not delay the score, which arrives over SSE independently. The frontend's own 15s gate is the one we are fixing.
- **Non-live timeline handling is correct.** Completed matches are served from a one-shot stored row and not re-fetched (see the comment at `matches.service.ts:362-365`).
- **The frontend no longer depends on any of the above being fixed.** All of it is shipped and working today: 58 test suites, 1425 tests, production build clean.

---

# Appendix: how the score defects presented to users

Included so the backend team can see the impact rather than just the field names. Every item below was a real report from a user looking at a live match.

| Backend defect | What the user saw |
|---|---|
| `teams.*.overs` rounded (#6) | Homepage card `9 ov`, match page `9.4 ov` — same match, same moment |
| `displayScore` not repaired (#2) | Predictions cards rendered with **no score at all** on live matches, while the homepage showed it fine |
| `runRate` contradicting runs/overs (#2A) | `306/1 · RR 10.14` on one card and `307/1 · RR 10.14` on another — the same run rate attached to two scores |
| `listLive()` ignoring Redis (#1) | Live lists on the homepage, matches page and predictions page all served a stale snapshot |
| Match row vs timeline written separately (#8) | Commentary at `32.6 overs` directly above a scorecard reading `32.4` |
| No atomic live snapshot (#9) | Three surfaces showing three different overs for the same delivery |

**The pattern worth taking away:** every one of these was invisible to a test that checked a single field in isolation, and visible the moment two fields were placed next to each other. The frontend now asserts that a score and the overs printed beside it always describe the same moment. A cheap equivalent on the API side — a consistency check on write — would prevent the whole class.

---

# Frontend changes shipped, for your awareness

Recorded because these changed what the frontend reads from the API, which may affect any other consumer you have. Full detail in `todayprogress.md`.

**New shared read path.** The frontend added `apps/web/src/hooks/useMatchState.ts`, exposing a pure function `deriveMatchState(match, timeline)`. It resolves score, runs, overs, wickets, run rate and batting side as **one internally consistent block**, and every surface on the site now calls it.

The selection rule: **pick the source furthest along in ball count, then read every value from that one source.** Ball count rather than run total, because a slow over yields fewer runs for the same number of balls and would let a stale higher total win. If sources tie on balls, the match row wins and the higher timeline score is deliberately not used.

Read order for the score: winning source → `displayScore` → `teams.*.score` / `teamScores.*.score`.

**Why this matters to you.** Until items **#2A**, **#2** and **#6** are fixed, every consumer has to do this reconciliation itself. We have now removed three separate copies of the same rule from the frontend (card, ticker, match page) and had to add a fourth in `deriveMatchState`. Any new consumer that reads the fields directly will reintroduce the bug.

**Behavioural notes:**

- **`currentInnings` is treated as a live-only field.** For a completed match the frontend reads `displayScore` / `displayOvers` / `teamScores` and never `currentInnings`. We found a finished match displaying a stale mid-match score because `currentInnings` was still populated. If the backend keeps writing `currentInnings` after a match ends, please consider clearing it, or documenting the field as live-only.
- **`runRate` is ignored** when `runs` and `overs` are both present, and recomputed from them. See item **#2A**.
- **Overs normalisation is a display rule only.** `5 overs + 6 balls` renders as `6 ov`, never `5.6`. No API change required. The ball-by-ball commentary intentionally keeps the raw historical label (`5.6`) because it is a record of a specific delivery.

**Predictions.** The situation builder now reads the same consolidated state, so a live card shows a score whenever any of `displayScore` / `currentInnings` / `teamScores` carries it. The predictions page also subscribes to the live stream, which it previously did not — it was the only page showing a frozen live score.

**Odds.** Market tab labels, selection column headings and all display copy are now generated on the frontend from the `marketKey` and `name` you return. No DTO change is needed and none is being requested. Two things worth knowing:

- The frontend no longer renders a **`draw`** selection, because cricket has no draw. If a `draw` key is returned it will be ignored. If its intended meaning is a tied match or a no-result, please clarify and we will label it accordingly.
- The frontend derives a `Payout` percentage from `bookmakerMargin` and clamps it to 0–100%. A stored margin outside 0–1 renders as a nonsense percentage, so it would be worth validating that on write.

**Timeline polling.** The client refetches the ball-by-ball timeline on a 15-second floor while a match is live. This is a **client-side delay we added ourselves** and it will be reduced to 3 seconds. It does not affect the score, which arrives over SSE independently. The backend's own 30-second upstream floor (`LIVE_TIMELINE_REFRESH_MIN_AGE_MS`) is doing its job correctly and is not a problem.
