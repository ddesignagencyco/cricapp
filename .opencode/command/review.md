---
description: Reviews the cricapp backend changes (read-only) with the backend-reviewer agent. Proposes corrections only — never modifies files. Optionally scope with an argument, e.g. /review prediction or /review apps/api/src/matches
agent: backend-reviewer
---

Review the current backend changes using the data-correctness categories below.

$ARGUMENTS

If no scope was given, review the whole working tree / current branch against origin/dev; if a scope was given (e.g. `prediction` or `apps/api/src/matches`), limit the review to that area.

Report **proposed corrections only** — never modify, create, delete, or run anything. Group findings by the four categories, each as `file:line → what's wrong → one-line proposed correction`:

1. **Schema / data-consistency drift** — code using fields/columns/JSON keys the Prisma schema or `@cricapp/shared-types` no longer define; status-mapping gaps (unseen status silently defaulting to `upcoming`, so `cancelled`/`abandoned`/`postponed`/`tied`/`completed` reads wrong); `teams`-array vs `home/away`-object drift; new DB fields never surfaced in `toSummary`/`CanonicalMatch` (`resultText`, `winnerId`, `tossWonBy`, `tossDecision`, `currentInnings`, `periodScores`, `displayOvers`, `teamScores`).

2. **Data flow ended-to-end** — ingestion → store/save → Redis publish → Socket.IO/SSE → API read/summary → prediction (prematch/live/settle/calibrate). Flag anything saved but never published/broadcast (live clients never update); matches never `srem`'d from the `matches:live` set once finished (stale live list); `settle` not guarded against re-scoring a finished match; live predictions throttled (`shouldScoreLive`, `LIVE_THROTTLE_MS`); timeline delta/seq keys that leak or never persist the full timeline when a match finishes.

3. **Missing / not-updated fields** — `updated_at = NOW()` forgotten; `ON CONFLICT DO UPDATE` SET list missing a column set on INSERT (goes stale once the row exists); completed matches left without `resultText`/`winnerId`/result fields; `savePrediction` column order vs SQL bind array drift; prediction feature/result rows missing a counterpart (orphan run, missing snapshot, skipped settle).

4. **Stale / TTL config hot spots** — Redis TTL shorter than the poll interval / live throttle (state expires between refreshes → stale reads / thundering herd); stale live set that is never pruned; env-gated dead paths (`LIVE_TIMELINE_DELTAS`, `LIVE_TIMELINE_SNAPSHOT_EVERY`) disabled by default.

For each finding give `file:line → problem → one-line fix`. Only flag real issues backed by code — no padding. End with a short "unverified / needs runtime" note for anything you couldn't confirm statically (live provider call, Redis state).
