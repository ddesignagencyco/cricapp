# Ingestion and prediction: problems found and fixes made

Date: 20 October 2026 · Branch: `full-site-regression`

This document records what was wrong with the ingestion service (the worker that fetches live cricket data from Sportradar) and the prediction service (the worker that calculates win probabilities), how each problem was found, what was changed, and in which files.

Commits:

| Commit | What it covers |
| --- | --- |
| `e1e7368` | Live scores: one consistent score per snapshot in ingestion, plus the website's live merge fixes |
| `ae0205f` | Live scores: scores bouncing back (151 → 136 → 151), commentary bar lag |
| `b8ed67a` | Ingestion: stalls, stuck "live" matches, rain stoppages, Redis reconnect |
| `7e8f416` | Prediction: live model fixes, Test matches, one writer only |

---

## Part 1 — Ingestion (`services/ingestion`)

### Problem 1.1 — Runs and overs came from two different moments

**What users saw:** a card showing `60/3 (14.2 ov)` while another part of the page showed `59/3`, or the homepage showing a different over to the match page.

**Root cause:** Sportradar sends two blocks in every match summary — the scorecard (`statistics`) and the status block (`sport_event_status`) — and they are updated at different times. Ingestion took **runs** from the scorecard and **overs** from the status block, so it stored scores that never existed. One API response was measured with `currentInnings` = 60 runs at 14.2 overs and `displayScore` = `59/3`; the scorecard itself said 60 at 14.3.

**Fix:** runs, wickets and overs for the current innings now come from **one** block — the scorecard's batting runs and wickets with the overs summed from the bowlers' figures. If the bowlers' figures are missing, the status block's own score-and-overs pair is used as a whole. `displayScore` and `displayOvers` are kept on the same instant. Chase innings use the bowlers' overs instead of `overs_completed` (which drops the balls of the current over).

**Files:** `services/ingestion/src/normalize.js`, `services/ingestion/test/normalize.test.js` (commit `e1e7368`).

### Problem 1.2 — One failed cycle froze live scores for two minutes

**What users saw:** every live score on the site stopped updating for minutes, then jumped.

**Root cause:** in the poll loop, a failed cycle (a 429, a timeout, a Redis error) slept the 60-second idle interval inside the error handler and then slept it **again** after it. Two minutes with no polling is longer than the 120-second lifetime of the `ingestion:heartbeat` key, so the heartbeat expired and nothing was published.

**Fix:** a failed cycle now retries on the normal live interval (15 s) and writes the heartbeat with the error message, so the admin health card shows what went wrong.

**File:** `services/ingestion/src/index.js` (commit `b8ed67a`).

### Problem 1.3 — One bad request paused every Sportradar call for five minutes

**Root cause:** the Sportradar client treated HTTP **400** the same as 401/403 ("bad key"), and paused **all** calls for five minutes. A single bad match id — for example an old fixture — froze live scoring.

**Fix:** only 401 and 403 pause the client. A 400 now only fails that one request.

**File:** `services/ingestion/src/sportradar.js` (commit `b8ed67a`).

### Problem 1.4 — A background job used up the call budget during live play

**What users saw:** today's ~10-minute freeze; also old matches dated weeks in the past kept showing as "Upcoming".

**Root cause:** the "refresh stale upcoming matches" job ran every 15 minutes, re-checked **up to 200** old fixtures (one Sportradar call each), and **never paused for live matches**. On a 1-request-per-second key that starved live scoring.

**Fix:** the job now pauses while any match is live, and checks at most `STALE_FIXTURE_BATCH_SIZE` fixtures per run (default **10**, configurable by environment variable).

**File:** `services/ingestion/src/refSync.js` (commit `b8ed67a`).

### Problem 1.5 — Finished matches stayed "live" for hours

**Root cause:** the poll loop only fetched matches the live schedule listed with status exactly `live`. A match drops off that schedule the moment it ends, so its final summary (last ball, result) was never fetched; the row stayed "live" until the daily sync, up to six hours later. Rain stoppages (`interrupted`) were also dropped.

**Fix:** the loop now also follows every match still held as live (the Redis live set) until **its own summary** says it ended — then the final score and result are written and it leaves the live set. Schedule statuses `interrupted` and `suspended` count as in play. A safety limit drops any held match scheduled more than 6 days ago so nothing is polled forever.

**File:** `services/ingestion/src/poll.js` (commit `b8ed67a`).

### Problem 1.6 — Rain made a live match look "upcoming" or "completed"

**Root cause:** the status mapping only recognised `live` / `in progress` / `innings`, so `interrupted` and `suspended` fell through to **upcoming**. Separately, the "is the match decided?" check searched for the word `ended`, which is also inside "susp**ended**", so a suspended match could be marked **completed**.

**Fix:** `interrupted` and `suspended` map to live in both status mappers. The decided check only matches whole words at the start of a token (`ended`, `match_ended` and `abandoned` still match; `suspended` does not).

**Files:** `services/ingestion/src/normalize.js`, `services/ingestion/src/store.js` (commit `b8ed67a`).

### Problem 1.7 — Redis outage stopped ingestion silently

**Root cause:** the Redis client's retry strategy gave up after 10 attempts (about a minute). After a longer Redis restart the worker kept running but wrote nothing.

**Fix:** it keeps reconnecting with a capped back-off.

**File:** `services/ingestion/src/redis.js` (commit `b8ed67a`).

### Ingestion tests

- New tests: rain stoppages map to live, a delayed start stays upcoming, a held match off the schedule is followed until it ends, held matches older than 6 days are dropped.
- The integration test now sets aside the real live match ids in the shared dev Redis while it runs, and the test files run one at a time (`--test-concurrency=1`) because they share one database and Redis.
- Files: `services/ingestion/test/normalize.test.js`, `services/ingestion/test/integration.test.js`, `services/ingestion/package.json`.
- Result: **73 / 73 passing**.

---

## Part 2 — Prediction (`services/prediction`)

### How predictions work (for reference)

- **Before the match:** a weighted formula over recent form (last 8 results), head-to-head (last 10), PSL table position, venue, toss and playing XI, then calibrated against settled matches.
- **During the match:** the score is compared with a typical total for the format (par: 160 T20, 270 ODI, 320 Test) using a resources table (balls and wickets left), then blended with the pre-match prediction, whose influence fades as the match goes on.

### Problem 2.1 — First innings ignored wickets

**Root cause:** the first-innings projection was `runs + run rate × overs left`. Wickets were not used, so **60/0 and 60/9 after ten overs gave the same win probability**.

**Fix:** the run-rate projection is scaled by the share of batting resources the lost wickets leave (from the existing resources table). With all wickets in hand the factor is 1, so nothing changes; a collapse now lowers the batting side's chance.

**File:** `services/prediction/src/live.js` (commit `7e8f416`).

### Problem 2.2 — The pre-match prediction came back at the start of the chase

**Root cause:** the fade of the pre-match prediction was measured per innings. At the first ball of the chase it reset to full weight (60%) and erased what the first innings had shown.

**Fix:** progress is measured across the whole match (first innings = first half, chase = second half), so the pre-match influence keeps fading instead of resetting.

**File:** `services/prediction/src/live.js` (commit `7e8f416`).

### Problem 2.3 — "Australia have a slight hold" on a 50/50 bar

**Root cause:** `momentum` was calculated from the **batting** side's point of view, but the website reads it as **home** (positive) vs **away** (negative). Before a ball was bowled it was always negative, so the site said the away side had the edge; when the away side batted well, it leaned towards the home side.

**Fix:** momentum is reported from the home side's point of view and is 0 before a ball is bowled.

**File:** `services/prediction/src/live.js` (commit `7e8f416`).

### Problem 2.4 — Test matches got confident, wrong live numbers

**Root cause:** the live model treats every match as one innings per side with no draw. A Test has up to four innings and draws, and a first-innings all-out could lock a Test at **100% / 0%** with 95% confidence.

**Fix:** Test matches skip the live model, and the "lock at the result" path never locks a Test. (Pre-match predictions for Tests are unchanged.)

**File:** `services/prediction/src/liveGuard.js` (commit `7e8f416`).

### Problem 2.5 — Two schedulers wrote predictions at the same time

**Root cause:** predictions can be produced by the long-running worker (`npm start`) **and** by the Supabase edge function run by pg_cron (`supabase/functions/prediction-run`). Nothing stopped both from running, so rows were duplicated and a card could flip between the two writers' numbers.

**Fix:** a Postgres **advisory lock** (no new table, no migration):

- The worker takes the lock when it starts and holds it for its lifetime. A second worker is refused.
- The edge function **probes** the lock in one SQL statement before each run and skips the run while the worker holds it.
- So whichever is deployed — worker, cron, or both — exactly one writes. If the worker stops, the cron job takes over automatically.
- The worker exits if the lock connection is lost, so the supervisor restarts it cleanly instead of two writers overlapping.

**Files:** `services/prediction/src/schedulerLock.js` (new), `services/prediction/src/index.js`, `supabase/functions/prediction-run/index.ts` (commit `7e8f416`).

**Deployment note:** session advisory locks need a real database session. Point `PREDICTION_LOCK_DATABASE_URL` (or `DIRECT_URL`) at a **direct or session-mode** connection if `DATABASE_URL` goes through a transaction pooler. The edge function's probe works through any pooler.

### Problem 2.6 — Bad input could store `NaN`

**Root cause:** a non-numeric run rate from the provider flowed into the formula and a `NaN` probability was saved.

**Fix:** a non-numeric run rate is treated as 0.

**File:** `services/prediction/src/live.js` (commit `7e8f416`).

### Prediction tests

- New tests: wickets lower first-innings chances; all wickets in hand projects as before; no prior reset at the chase; momentum from the home side and 0 before the first ball; no `NaN`; Tests skipped and never locked; "suspended" is not "decided"; the scheduler-lock probe.
- Files: `services/prediction/test/live.test.js`, `services/prediction/test/liveGuard.test.js`, `services/prediction/test/schedulerLock.test.js` (new), `services/prediction/package.json`.
- Result: **77 / 77 passing**. The lock was also checked against the real database: free before the worker, held while it runs, a second worker refused, free after release.

---

## Part 3 — Website live-score fixes (`apps/web`)

These went in with the live-score commits and are listed here because they depend on the ingestion data.

| Problem | Fix | Files |
| --- | --- | --- |
| On list pages a match's update was dropped when another match scored in the same second | Socket updates are batched per match | `apps/web/src/hooks/useMatchStream.ts` |
| A 30-second poll older than the socket replaced newer scores | Polls are merged through the "never go backwards" rule | `apps/web/src/components/boards/MatchBoard.tsx`, `LiveNowSection.tsx`, `MatchTickerBar.tsx`, `predictions/PredictionsHub.tsx` |
| Scores bounced back (151 → 136 → 151) | Snapshots are ordered by balls, runs and wickets — `revision` only breaks ties — and every page starts from the newest score the tab has seen | `apps/web/src/hooks/useMatchStream.ts`, `components/boards/MatchDetailBody.tsx`, `queries/*` |
| The match page header froze on the timeline loaded with the page | The header compares the timeline with the live score and uses whichever is further along | `apps/web/src/lib/matchInnings.ts` |
| Commentary bar ("Inn 1 …") lagged the header | It prints the in-progress innings from the same live score as the header | `apps/web/src/components/MatchTimeline.tsx` |

---

## After deploying

1. Restart **ingestion** (`services/ingestion`, `npm start`) and the **prediction** worker (`services/prediction`, `npm start`) so they run the new code.
2. Keep only **one** ingestion process per Sportradar key. There is no leader lock in ingestion yet (see below).

## Known issues not fixed yet

From the audit; none of these were changed in this round.

**Prediction display (website):**
- The card labels runs **required** as "Target".
- Percentages are rounded separately and can add to 100.1%.
- Insight sentences are joined without full stops ("England England chance moved…").
- The score band shows before any ball and in the chase (it can exceed the target).
- Live "confidence" is a fixed number (40% / 55%) and carries no information.
- Old predictions are shown without a "stale" flag when ingestion stops.
- Existing live rows for Test matches are still stored and shown until hidden in the UI.

**Prediction model:**
- No men's/women's par split (women's chases look harder than they are).
- The chase formula's scale is steep and the run-rate term double-counts the deficit.
- Elo team ratings are computed but never used.
- Matches already decided write a new row every cycle.
- Missing database indexes on `sport_event_records(event_id, updated_at)` and `prediction_runs`.

**Ingestion:**
- Live and background calls share one rate limit with no priority, and the API also calls Sportradar outside that limit.
- No leader lock between two ingestion processes.
- Each match is saved twice per cycle.
- Background syncs can overwrite live rows with older schedule data.
- `JSON.stringify(null)` defeats `COALESCE` in `saveMatch`.
- Test-match team totals across innings are wrong.
- No Postgres query timeouts.
- The API's `enrichFromStoredSummary()` overwrites `displayOvers` with the provider's lagging field.
- The anonymous `/auth/me` returns 401 on every page.
