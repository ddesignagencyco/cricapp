# AdSense Advertising System

Production-ready Google AdSense infrastructure. Everything lives inside
`apps/web` — no backend changes were required.

## How it is initialized

- `src/components/advertisements/AdProvider.tsx` mounts once in
  `src/app/layout.tsx`. It injects the official `adsbygoogle.js` tag **once**
  (`next/script`, deduplicated on `id="adsbygoogle"`, `afterInteractive`).
- Publisher id resolution (`src/lib/advertisements/adsConfig.ts`,
  `resolvePublisherId`): stored site-settings `ads.clientId` first,
  `NEXT_PUBLIC_ADSENSE_CLIENT` fallback second. Canonicalized to `ca-pub-…`.
  No tag renders without an id, so local dev never crashes.
- `AutoAds` (same folder) issues the single page-level push
  (`enable_page_level_ads`) only when `adsense` mode is on **and**
  `NEXT_PUBLIC_ADSENSE_AUTO_ADS=1`. It mounts with the script tag, so
  client-side navigation cannot duplicate it.
- Every `<ins>` queues exactly one `(adsbygoogle).push({})` (`AdSlot.tsx`,
  `data-ad-queued` guard survives StrictMode double-effects). Rejections and
  ad-blocker globals are swallowed — a lost auction never breaks the page.
- Unfilled / blocked slots collapse after 2.5s (`AD_BLOCK_GRACE_MS`) via the
  `data-ad-status` observer, so no empty boxes linger.

## Components (`src/components/advertisements/`, aliased at `src/components/ads/`)

| Component | Format | Use |
|---|---|---|
| `AdSlot` | `auto` / `autorelaxed` / `fluid` / `rectangle` | Low-level engine. All gating (mode, route, placement toggle, slot id) lives here. Prefer the wrappers below. |
| `AdBanner` | responsive `auto` | Homepage/listing/search banners. Reserves `minHeight` against CLS. |
| `AdInArticle` | `fluid` | Inside long article bodies (after ~4th paragraph). |
| `AdMultiplex` | `autorelaxed` (official Multiplex) | After article content, bottom of long listings. Needs a dedicated Multiplex unit id. |
| `AdSideRail` | placement default | Desktop-only (`lg:block`, 300px). Article/detail sidebars. |
| `AdAnchor` / `AdVignette` | Auto Ads (no `<ins>`) | Render `null` by design. Never replace with sticky divs/popups. |
| `HouseAd` | placeholder | Dev fallback in `house` mode. Never ships as a production ad. |
| `HideAds` | — | Error / 404 pages. |

`AdSlot` props: `placement` (required), `size`, `className`, `inFeed`,
`slot` (explicit unit id override, 10–20 digits), `format`, `layout`.

## Conceptual placements → registry keys

Defined in `adsConfig.ts` (`CONCEPTUAL_PLACEMENT_MAP`); storage keys live in
`registry.ts` (`AD_PLACEMENTS`, also driving the admin screen):

| Concept | Registry key | Rendered on |
|---|---|---|
| `homepage_top` | `home-top-mobile` | Homepage (mobile strip; desktop ticker in its place) |
| `homepage_middle` | `home-mid` | Homepage between Upcoming and PSL Spotlight |
| `homepage_bottom` | `home-footer` | Homepage above footer |
| `article_top` | `news-detail-top` | Article, after hero image |
| `article_inline` | `news-detail-inarticle` | Article body, after 4th paragraph |
| `article_bottom` | `news-detail-after-related` | Article, multiplex after related block |
| `listing_inline` | `news-list-infeed` | News grid, one in-feed card |
| `sidebar` | `news-detail-sidebar`, `match-detail-sidebar`, `tournament-detail-sidebar`, … | Detail-page sticky sidebars |
| `multiplex` | `home-multiplex` | Homepage bottom (above footer banner) |
| `anchor` / `vignette` | — (Auto Ads) | Site-wide once enabled (see below) |
| `side_rail` | `layout-sidebar` | Layout sidebar track (desktop) |

Listing top coverage comes from the shared `global-top` banner (`ClientLayout`),
already rendered on `/news`, `/search` and section pages. New keys
(`news-detail-top`, `home-multiplex`, `search-bottom`) appear in the admin
screen automatically — no backend change needed (storage is free-form).

## Pages integrated (and deliberately skipped)

- Homepage: mobile top, mid banner, multiplex, footer banner.
- Article (`NewsDetailBody`): top banner → inline (after ¶4) → multiplex after
  related → comments. Never after every paragraph; kept clear of
  favorite/share controls.
- News listings: global top + one in-feed card + bottom banner (only when ≥8).
- Search: global top + single bottom banner only when results exist.
- Teams / players / tournaments / PSL / matches / authors: existing after-intro
  and sidebar slots kept; **no new units added** — utility/detail pages stay
  clean per policy review.
- Auth, admin, editorial/legal, error/404: ads suppressed
  (`shouldHideDummyAds`, route gates, `HideAds`).

## Anchor / Vignette configuration

Code cannot force these on — the AdSense dashboard toggle is the source of
truth. To activate: (1) set `NEXT_PUBLIC_ADSENSE_AUTO_ADS=1` (+ `…_ANCHOR=1` /
`…_VIGNETTE=1`), (2) enable the format under Ads → Auto ads in the dashboard.

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_ADSENSE_CLIENT` | prod yes | Publisher id fallback (`ca-pub-…` or `pub-…`). Stored config wins. |
| `NEXT_PUBLIC_ADSENSE_AUTO_ADS` | no (`0`) | Page-level Auto Ads eligibility. |
| `NEXT_PUBLIC_ADSENSE_ANCHOR` | no (on when Auto Ads on) | Anchor eligibility. |
| `NEXT_PUBLIC_ADSENSE_VIGNETTE` | no (on when Auto Ads on) | Vignette eligibility. |

## Local testing

1. Leave the vars empty → `house` placeholders, layout intact.
2. Open `/ads-preview` (unlinked, `noindex`, not in the sitemap): every format — top/mid banners, in-article fluid, sidebar box, desktop side rail, multiplex, in-feed card — plus clearly-labeled anchor/vignette **simulators** (house mode, that page only) to test layout impact. Simulators return `null` in `adsense`/`off` modes, so production can never show a fake ad. This is the fastest way to verify all types pre-approval.
2. `NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-0000000000000000` + `adsense` mode in
   admin → real `<ins>` units with your test slot ids; unfilled units collapse.
3. Add `?google_debug` / use AdSense preview, check 320–1920px widths for
   overflow (containers are `max-w-full`, `min-w-0`, `overflow-hidden`).
4. `npm run lint && npm run typecheck && npm run test && npm run build`.

## Production checklist (AdSense dashboard, manual)

1. Create ad units: display (responsive), in-article (fluid), Multiplex; paste
   ids into Admin → Settings → Ads (or per-placement rows).
2. Set `NEXT_PUBLIC_ADSENSE_CLIENT` in hosting env (or save publisher id in
   admin; admin wins).
3. Verify `https://<domain>/app-ads.txt` serves the `google.com, …, DIRECT` line.
4. Optionally enable Auto Ads + Anchor/Vignette (dashboard) and set the
   corresponding env flags.
5. Request review / lift the “policy issues” flag if the account is new.
