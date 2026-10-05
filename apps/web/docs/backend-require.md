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

## Manual (AdSense dashboard — not code)

- Create display / in-article-fluid / Multiplex units and paste ids into
  Admin → Settings → Ads.
- Enable Auto Ads + Anchor/Vignette formats if desired, then set
  `NEXT_PUBLIC_ADSENSE_AUTO_ADS=1` (+ `…_ANCHOR` / `…_VIGNETTE`).
- Confirm `GET /app-ads.txt` returns the `google.com, …, DIRECT` line in prod.
