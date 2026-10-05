# Match data sync — backend changes required

Investigation target: `sr:match:74932666` (Zimbabwe vs West Indies Women), live.

**Status:** the dominant cause of "card says one score, header says another" was a
**frontend** bug and is fixed (see the fix list below). This file records only what
genuinely cannot be fixed inside `apps/web`.

No backend, API, worker, ingestion, socket-server, database or Prisma file was
modified.

---

## 1. Exact root cause (backend-relevant part)

There are **three independent writers** of the same live score, and the frontend
receives them through two different endpoints plus a socket:

| Source | Endpoint / channel | Written by | Observed lag |
|---|---|---|---|
| Match row (`displayScore`, `displayOvers`, `currentInnings`) | `GET /api/matches/:id` | ingest path A | lags the timeline by 1+ balls |
| Timeline status (`sport_event_status.display_score`) | `GET /api/matches/:id/timeline` | ingest path B | lags its own ball events |
| Timeline ball events (`timeline[].display_score`) | same | ingest path B | freshest |
| Live snapshot | socket `/matches` → `live:update`, `match:update` | ingest path A or B (unconfirmed) | freshest when connected |

The frontend can only *reconcile* these. It cannot know which is correct, and it
cannot detect a **dropped** socket event, because the payloads carry no ordering
information.

**The decisive gap: no monotonic revision.** Every payload is a bare snapshot with
no sequence number, version, or `updatedAt`. Consequences:

- A client cannot distinguish a legitimate coarse write (`12` overs) from a stale
  redelivery (`12` overs arriving after `12.3`). It can only compare ball counts.
- A client cannot detect that it **missed** a ball, so it cannot request the gap — it
  silently waits for the next event.
- Two tabs, or a card and a detail page, can each apply a different one of two
  conflicting snapshots with no way to arbitrate.

## 2. Affected frontend files (already fixed — listed for traceability)

- `src/lib/matchTimelineState.ts` — did not unwrap `{ sport_event_timeline: … }`,
  so `timelineInningsState()` returned `null` for the real timeline payload and the
  timeline contributed nothing to the score.
- `src/lib/deriveMatchState.ts` — discarded the timeline wholesale when its runs were
  unreadable, letting the known-stale row win.
- `src/lib/matchViewModel.ts` — `15.${…}` template emitted `15. overs left`.
- `src/hooks/useMatchStream.ts` — percent-encoded ids never matched; stale redelivery
  overwrote `runs` while keeping the newer `overs` (impossible innings).
- `src/hooks/useMatchState.ts` — merged the socket envelope instead of `update.data`,
  so the score never moved at all.
- `src/queries/useMatchCentreQueries.ts`, `src/queries/useDirectoryQueries.ts` —
  added `LIVE_MATCH_REFETCH_MS` (30s) polling fallback + timeline refetch.
- `src/components/boards/MatchDetailBody.tsx` — socket gated on `status === 'live'`;
  two copies of the timeline (frozen `matchContext` vs fetched query).
- `src/components/LiveNowSection.tsx` — no polling; a stale ISR snapshot replaced
  socket state on refresh.

## 3. Backend / API / socket behaviour involved

1. `GET /api/matches/:id` returns `displayScore`, `displayOvers`, `currentInnings`
   and `teams[].score` that **do not agree with each other**, and lag the timeline.
2. `GET /api/matches/:id/timeline` returns the **entire** payload every call — it is
   not a delta. For a Test the events alone are ~1.6 MB. There is no `?since=` /
   revision support, so there is no cheap catch-up after a missed ball.
3. `sport_event_status.display_score` inside the timeline payload can lag the
   `timeline[]` ball events in the *same* response.
4. The socket broadcasts a snapshot with no revision, and does **not** replay current
   state on `subscribe:match` — a page that connects mid-over gets no backlog.
5. `GET /api/matches/live` and `GET /api/matches/:id` are not demonstrably served from
   the same cache/DB read path.

## 4. Expected vs actual

**Expected:** for one match, every surface resolves to the same current state. If the
timeline says `63/1` at `5.3`, the header, card, homepage, live page and scorecard all
say `63/1` at `5.3`, and the commentary agrees.

**Actual (before the frontend fix):** header `58/1 (4.2 ov)` while the commentary
directly beneath it showed `63/1 (5.3)` on the same page — and the header's own line
was internally inconsistent (`58/1`, `RR 13.38`, but `16.1 overs left`, which implies
`3.5`). Homepage card updated first; the detail header followed only after a refresh.

## 5. Recommended backend changes, in priority order

### P0 — one canonical innings writer
Derive `displayScore`, `displayOvers`, `currentInnings`, `sport_event_status` and the
ball events from a **single** ingest step, committed together. Until then the client
must guess "who is further along", which is inherently racy.

### P0 — monotonic revision on every snapshot
Add an integer `revision` (monotonic per match, incremented once per ball) plus
`updatedAt` to:
- `GET /api/matches/:id`
- `GET /api/matches/live`
- the socket payload for `live:update` / `match:update`

This is the real fix for missed balls. The client can then reject out-of-order
delivery and request gaps deterministically instead of comparing ball counts.

### P1 — delta timeline endpoint
```
GET /api/matches/:id/timeline?since=<revision>
```
Returns only events after `revision`:
```json
{
  "matchId": "sr:match:74932666",
  "revision": 412,
  "complete": false,
  "payload": { "sport_event_timeline": { "timeline": [ /* new ball events only */ ] } }
}
```
Return `complete: true` with the full payload when `since` is absent or too old. A
404/204 means "no new events" — not an error to retry.

### P1 — replay current state on subscribe
On `subscribe:match`, immediately emit the current canonical snapshot (with
`revision`) before any future events. This alone removes most "frozen until refresh"
reports for pages opened mid-over.

### P1 — `sport_event_status` must not lag its own events
Write the status block in the same transaction as the event append, or derive the
status block from the events on read.

### P2 — cache parity
Confirm `GET /api/matches/live` and `GET /api/matches/:id` share one read path with
the same TTL, and that neither is CDN-cached while a match is live. A cached server
render is indistinguishable from a dead socket on the client.

### P2 — correct team `code`
`West Indies Women` is returned with `code: "WIN"` while the badge shows `WI`, so the
card prints "WIN batting". Return a consistent code (`WI`, or `WIW` if the men's side
must be distinguished). Deliberately **not** patched in the UI — hardcoding a mapping
would break for the next provider.

## 6. Example: what the frontend would do with a revision

```ts
// Socket delivers a snapshot older than what we already applied.
if (incoming.revision <= appliedRevision) return;      // stale redelivery — drop
if (incoming.revision > appliedRevision + 1) {
  // We missed one or more balls: close the gap instead of trusting a partial snapshot.
  refetchTimeline({ since: appliedRevision });
}
```

None of this is possible today, because no payload carries `revision`.

## 7. Priority / severity

| # | Issue | Severity |
|---|---|---|
| 1 | No monotonic revision → cannot detect/close missed balls | **Critical** |
| 2 | Multiple writers for one score, committed independently | **Critical** |
| 3 | No snapshot replay on `subscribe:match` | **High** |
| 4 | Timeline endpoint is full-payload, no delta | **High** |
| 5 | `sport_event_status` lags its own events | **High** |
| 6 | `/matches/live` vs `/matches/:id` cache parity unverified | **Medium** |
| 7 | `code: "WIN"` inconsistent with the `WI` badge | **Low** (cosmetic) |

## 8. What the frontend can still guarantee without backend changes

- All surfaces converge to the same value within one poll interval (30s), and
  immediately when the socket is healthy.
- The score never regresses to an older state on screen.
- The header and the commentary are computed from **one** timeline payload, so they
  cannot disagree with each other on the same page.

What it **cannot** guarantee: that a *dropped* socket ball is recovered before the next
poll, and that the provider's own conflicting fields are resolved correctly. Both need
items 1–5 above.