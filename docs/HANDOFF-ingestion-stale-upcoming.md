# Handoff — Ingestion: `upcoming` matches never leave that state

**Date:** 2026-10-03 · **From:** frontend · **To:** backend/ingestion
**Scope:** one focused fix. Not a rewrite. Roughly 20 lines and a backfill.

---

## 1. What is wrong

`matches` rows sit at `status = 'upcoming'` long after their start time has passed, and nothing ever moves them on.

Measured on the dev database before it was reset:

| | rows | earliest | latest |
|---|---|---|---|
| Genuinely future fixtures | 27 | 2026-10-02 | 2026-10-04 |
| **`upcoming`, start time already past** | **19** | **2026-08-03** | **2026-10-02** |

19 of 46. The oldest was **two months** overdue.

The visible symptom: on `/matches?tab=upcoming`, sorted by start time, the two-month-old rows took the top of the list. The page opened on a match from **August** while the fixtures a reader could actually attend on the 3rd sat below them.

## 2. Why it happens

`saveMatch` is not the problem — it would happily overwrite a stale `upcoming`. In `services/ingestion/src/store.js`:

```sql
status = CASE
  WHEN matches.status IN ('live', 'completed', 'cancelled')
   AND EXCLUDED.status = 'upcoming' THEN matches.status
  ELSE EXCLUDED.status
END
```

`upcoming` is not in that guard list, so a fresh `upcoming` overwrites an old `upcoming` freely. **The guard is not what is stopping the update.**

The problem is that the update never arrives. Those fixtures are not in:

- the live poll — they are not live (`poll.js` `processLiveMatch`)
- the 365-day one-shot backfill — `listEventIdsWithoutTimeline()` in `store.js` explicitly excludes `live` and `upcoming`
- the daily schedule/results sync, which covers a bounded recent window

So once a fixture is ingested as `upcoming`, no code path asks the provider about it again. If it is postponed, renamed, or **actually played**, the row is never corrected. The `teams`/`tournament`/`scores` for that match are wrong too, not just the status.

## 3. The fix

**Re-poll `upcoming` rows whose start time has passed, and let the existing upsert correct them.**

Sketch:

```js
// A new ref-state interval, alongside the existing `liveTimeline: 5 * 60e3`.
const STALE_FIXTURE_POLL_MS = 15 * 60e3;

export async function staleUpcomingIds(limit = 200) {
  const { rows } = await query(
    `SELECT match_id FROM matches
      WHERE status = 'upcoming'
        AND scheduled IS NOT NULL
        AND left(scheduled, 19) < left($1, 19)
      ORDER BY scheduled ASC
      LIMIT $2`,
    [new Date().toISOString().slice(0, 19) + '+00:00', limit],
  );
  return rows.map((r) => r.match_id);
}
```

Then fetch summaries for those ids and push them through the normal `normalizeSportradar` → `saveMatch` path. **No new write path** — `saveMatch` already does the right thing with the result, including `tournament_id` and `team_scores`.

Three details that matter:

1. **Compare on `left(scheduled, 19)`.** `scheduled` is `TEXT`. `2026-10-05T14:00:00+00:00` and `2026-10-05T14:00:00Z` are the same instant written two ways; a plain text compare gives an arbitrary answer at the one second where the two forms differ. Truncating to `YYYY-MM-DDTHH:MM:SS` is byte-identical in both.
2. **Bound the batch and the id list.** At `SPORTRADAR_QPS=1`, 200 ids is already 200 requests. Do not crawl the whole table.
3. **Do not special-case the status.** If the provider says the match is `completed`, write `completed`. That is the whole point — the fix is a read, not a rule.

## 4. Backfill for the rows already stuck

The new poll only helps rows that are still `upcoming`. The 19 already-2-months-overdue ones need one pass over historical data. Either:

- extend the existing 365-day one-shot to also cover `upcoming` rows with a past `scheduled` — it already has the fetch-and-upsert machinery; and/or
- a one-off script run once, same query, no schedule

`listEventIdsWithoutTimeline()` is the natural home if it is still there. Note that including them changes what "365-day" means for that query, so it is a deliberate edit rather than a drive-by one.

## 5. Please confirm

1. **Is there already a mechanism I missed?** A schedule sync, a cron, a provider webhook. If something is supposed to do this and is not firing, the fix is one line, not twenty.
2. **Do we want to keep `upcoming` rows at all?** If a fixture is never corrected, an alternative is to **expire** them at read time or delete rows whose start time is a month past. That is worse — it hides the data problem instead of fixing it — but it is cheaper than polling, and if the provider's historical coverage for old fixtures is poor the polling approach may not converge.
3. **Does the provider return correct data for a match that finished weeks ago?** If the summary endpoint has a retention window, the poll will keep re-fetching rows it can never correct, and the right answer becomes a shorter expiry.

## 6. What is already done on the API side, so nobody duplicates it

The reader-visible symptom is **already mitigated** so the site is not broken in the meantime:

`GET /matches` now sorts live first, then genuine fixtures soonest-first, then results newest-first, with a row whose `upcoming` status has a past start time sorted **below** the real fixtures:

```
ORDER BY
  CASE status WHEN 'live' THEN 0 WHEN 'upcoming' THEN 1 ELSE 2 END ASC,
  CASE WHEN status = 'upcoming' AND left(scheduled,19) < left($now,19)
       THEN 1 ELSE 0 END ASC,
  CASE WHEN status IN ('live','upcoming') THEN scheduled END ASC NULLS LAST,
  scheduled DESC NULLS LAST,
  match_id ASC
```

**This is a display workaround, not a fix.** It sorts the wrong rows lower; it does not correct them. Once ingestion stops the drift, the second sort key becomes a no-op and can be dropped.

Do not rely on it. The `status` column is still wrong on those rows, and anything reading `status` directly — the assistant, predictions, the ad and news joins — sees the wrong value.

## 7. Known rough edge this surfaced

`matches.scheduled` is `TEXT`. It works today because every stored value is UTC ISO 8601 (`1317 of 1317` matched `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\+00:00$` when checked), but:

- a non-UTC offset would make every date sort and compare wrongly, silently
- nothing at the database level prevents it

A `timestamptz` column is the durable answer. It is a migration plus a rewrite of every `scheduled` reader across `services/ingestion` and `apps/api`, so it is **not** part of this handoff. Raising it so it gets scheduled rather than discovered.

## 8. Acceptance

1. No row has `status = 'upcoming'` with `scheduled` in the past, older than one poll interval:

```sql
SELECT match_id, scheduled FROM matches
WHERE status = 'upcoming' AND left(scheduled,19) < left('2026-10-03T00:00:00',19)
ORDER BY scheduled;
```

2. A fixture the provider postponed comes back `upcoming` with a new time, not a past one.
3. A fixture the provider reports as played comes back `completed`, **with scores and a result** — not just the status flipped.
4. A finished match keeps its final full timeline (the one-shot backfill already guarantees this; confirm the new path does not disturb it).
5. The poll does not exceed `SPORTRADAR_QPS` or run unbounded.

```bash
# 5. the query that should return nothing
docker exec -i cricapp-postgres psql -U cricapp -d cricapp -c "
SELECT match_id, scheduled FROM matches
WHERE status='upcoming' AND left(scheduled,19) < left('$(date -u +%Y-%m-%dT%H:%M:%S)',19);"
```

---

## Also still open from the previous handoff

Not part of this task, listed so nothing is lost:

- **`requiredRuns: 1`** on live chases (§5.1) — the job writing the `live` prediction stage is still unidentified.
- **`oversBalls` is misnamed** — the value is `10.1` (overs notation), the name implies 61 balls. Rename or drop.
- **`runRate` backfill** — the derivation fix is ingestion-side, so already-stored rows keep the old wrong value.
- **`tournament_id` backfill** — populated on only **169 of 1,552** rows when last checked. The API can filter by it; the data is not there yet.
- **`services/ingestion/data/init.sql`** — bootstrap `CREATE TABLE matches` has no `tournament_id`. Harmless today (the migration is `ADD COLUMN IF NOT EXISTS`), but the two files disagree.
- **`services/ingestion/src/store.js:30`** — the `tournament_id = COALESCE(...)` line is indented 6 spaces where its siblings use 7. Cosmetic.