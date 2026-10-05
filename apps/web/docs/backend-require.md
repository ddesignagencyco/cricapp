# Backend Handoff — AdSense System

Scope rule respected: no files outside `apps/web` were touched. Everything the
AdSense system needs is implemented frontend-side. This file lists what, if
anything, is asked of the backend/other agent.

## Required: nothing

- New placement keys (`news-detail-top`, `home-multiplex`, `search-bottom`)
  are stored in the existing free-form `ads.placements` map
  (`Record<string, { enabled, slotId }>`). The API already accepts any key
  matching `/^[a-z0-9][a-z0-9-]{0,63}$/` — all three comply — so **no API
  change is needed**.
- The admin Ads panel (`apps/web` only) reads `AD_PLACEMENTS` from the web
  registry and picks the new rows up automatically.
- Publisher identity falls back to `NEXT_PUBLIC_ADSENSE_CLIENT` when
  `ads.clientId` is unset; `app-ads.txt` uses the same resolution. If the
  backend later wants to own the publisher id centrally, it can keep saving
  `ads.clientId` via site-settings — the frontend already prefers it.

## Optional (only if the backend team wants it)

1. Validate `defaultSlots` / `placements` slot ids against `/^\d{10,20}$/` and
   publisher ids against `/^(ca-)?pub-\d{10,20}$/` at write time (422 instead
   of today's silent `null` normalization). Frontend already validates in the
   admin form; server-side would just make failures louder.
2. Surface an `ads.multiplexSlots`-style hint or UM comment if editors confuse
   display units with Multiplex/fluid units — purely a dashboard-confusion
   guard, not a blocker. The frontend collapses mismatched units gracefully.

## First-visit newsletter modal + alert opt-in (frontend-only, added later)

`src/components/NewsletterModal.tsx` reuses `POST /newsletter/subscribe` and the
existing `requestNotificationPermission()` service — **no backend change needed
for it to work today.**

If you want push to actually reach browsers that grant permission, the backend
already exposes `POST /devices` (`registerDevice`) and `/notifications/history`,
so the gap is frontend-side, not backend-side:

- a service worker that handles push messages and calls `showNotification`
  (no `sw.js` / `pushManager` usage exists anywhere in `apps/web` today);
- calling `registerDevice({ fcmToken, platform: 'web' })` after the visitor
  grants permission.

Left out deliberately: a service worker changes caching site-wide, which is a
performance decision beyond this task's scope. Ask and it can be added as a
separate, isolated change.

## Live-score consistency between pages (answered: NOT caused by the ad work)

Reported and then confirmed by the reporter: the homepage/live card advances
(13 overs) while `/matches/[id]` stays frozen at 12.3 until a manual refresh.
Refresh fixes it, which rules out the API being wrong and points at the client.

**Superseded — see "Live-score sync" below.** The causes identified here (a
socket-only update path gated on `status === 'live'`, no polling fallback, and the
header reconciling against a second, frozen copy of the timeline) have all been
fixed in `apps/web`. Kept only as the original diagnosis.

## Live-score sync — frontend fixed, backend changes still needed

Your read was right: **the timeline advances and the socket misses balls.** I traced
it end to end. Below is what was wrong, what I fixed in the web app, and what only
the backend can settle.

### Fixed in `apps/web` (no backend needed)

1. **The socket was switched off whenever `status !== 'live'`.**
   `MatchDetailBody`, `useMatchState` and `MatchPredictionsView` all passed
   `enabled && isLive` into `useMatchStream`. An innings break, a provider status
   variant, or a snapshot taken before the match started silently disabled the only
   update path — the header then sat on its server snapshot until a manual refresh,
   while the homepage (always subscribed) kept moving. All three are now always
   subscribed; `useMatchStream` already discards other matches by id.

2. **Percent-encoded match ids never matched.** The detail page reads its id from the
   URL segment (`sr%3Amatch%3A74932666`), the socket sends the raw provider id
   (`sr:match:74932666`). Compared as raw strings they never matched, so a per-match
   page dropped **every** update. Both sides are now normalised before comparison.

3. **`useMatchState` merged the socket envelope, not the snapshot.** It passed
   `{ type, matchId, data, ts }` into `mergeMatchLivePayload`, which then walked those
   four keys instead of the score fields. The live score silently never moved. The list
   surfaces were unaffected because `mergeLiveUpdate` reads `update.data` itself.

4. **A stale redelivery walked the score backwards.** `mergeInnings` protected only
   `overs`, so a late duplicate still overwrote `runs` while the newer decimal overs
   was kept — producing an impossible innings (74 runs at 12.3 overs after 78 had
   already been bowled). Runs/wickets/overs now move together: a snapshot behind in
   balls is ignored outright unless its run total has genuinely advanced, in which
   case it is kept and only the coarser overs string is preserved.

5. **Two copies of the timeline on one page (your 12.1 vs 12.2 symptom).** The header
   reconciled against `matchContext` — the slim payload captured once by the server
   render and never refreshed — while the commentary list rendered a second copy
   fetched when the tab opened. `deriveMatchState` lets whichever source is further
   along in balls win, so the frozen copy outvoted the live one. There is now one
   timeline, refreshed on the live cadence, and it feeds both.

6. **Self-healing polling.** The match row polls every 30s while live and the live
   list polls on the same shared constant, so a card and the page it links to can
   never sit on visibly different scores. `LIVE_MATCH_REFETCH_MS` in
   `src/queries/useMatchCentreQueries.ts` is the single knob.

7. **UI fixes:** the match tab bar no longer paints over the open mobile browse sheet
   (`.mc-tabs-sticky` was `z-index: 30`, tying the sheet's `z-[30]` and winning on DOM
   order), the full-width blue rule across the menu is gone (the active underline was
   an `after:` pseudo-element on a link with no `relative`), and the mobile bar is now
   Home / Matches / Schedule / News + Browse.

### Backend changes needed — I did not make these

1. **Single writer for live score.** The match row (`displayScore`, `currentInnings`)
   and the timeline (`sport_event_status`, ball events) are written by different
   paths and are written at different times. Until one component owns both, "which is
   further along" has to be guessed on the client. Prefer deriving both from the same
   ingest, or publish one canonical innings snapshot both read.

2. **A monotonic revision / sequence number per ball.** This is the actual fix for
   "the socket misses a ball". Right now a client can only compare *ball counts*, so it
   cannot tell a legitimate 12 overs after 12.3 (coarse write) from a stale redelivery,
   and it cannot detect a genuinely dropped event. If every snapshot carries
   `revision` (or `seq`) plus an `updatedAt`, the client can reject anything out of
   order and request the gap — and the polling fallback can send `?since=<revision>`.

3. **A delta endpoint for the timeline.** `GET /matches/:id/timeline` returns the
   **entire** payload every time (~1.6 MB for a Test; the events alone are ~1.6 MB of
   that). It is not a delta. Two consequences: opening/refresh-repolling Commentary
   re-downloads megabytes, and there is no cheap way to catch up after a missed ball.
   Please add something like `GET /matches/:id/timeline?since=<revision>` returning
   only new events, and have the socket broadcast the same revision.

4. **Socket should replay on subscribe.** A page that connects mid-over currently gets
   no backlog, so it depends entirely on the next broadcast. On `subscribe:match`,
   send the current canonical snapshot immediately — this alone removes most of the
   "frozen until refresh" reports.

5. **Check the cache paths.** Confirm `GET /matches/live` and `GET /matches/:id` read
   the same source with the same (ideally zero) TTL, and that `GET /matches/:id` is not
   CDN-cached during a live match. A cached server render is indistinguishable from a
   frozen socket on the client.

## Manual (AdSense dashboard — not code)

- Create display / in-article-fluid / Multiplex units and paste ids into
  Admin → Settings → Ads.
- Enable Auto Ads + Anchor/Vignette formats if desired, then set
  `NEXT_PUBLIC_ADSENSE_AUTO_ADS=1` (+ `…_ANCHOR` / `…_VIGNETTE`).
- Confirm `GET /app-ads.txt` returns the `google.com, …, DIRECT` line in prod.
