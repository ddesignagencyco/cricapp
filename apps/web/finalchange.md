# PakCricZone frontend production-readiness pass

## Scope

All inspected and modified files are inside `apps/web/`. No API, Prisma, Docker, root configuration, lockfile, environment, or other application file was changed.

## Route inventory

- Public: `/`, `/matches`, `/matches/[id]`, `/schedules`, `/teams`, `/teams/[id]`, `/players`, `/players/[id]`, `/tours`, `/tournaments`, `/tournaments/[id]`, `/psl`, `/stats`, `/news`, `/news/[id]`, `/search`, `/streams`, `/favorites`, `/about`, `/contact`, `/privacy`, `/terms`.
- Authentication: `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, plus `/signin` and `/signup` redirects.
- Admin: `/admin`, `/admin/news`, `/admin/news/new`, `/admin/news/[id]/edit`, `/admin/articles` redirect, `/admin/categories`, `/admin/matches`, `/admin/teams`, `/admin/players`, `/admin/tournaments`, `/admin/comments`, `/admin/media`, `/admin/users`, `/admin/settings`.
- Framework: global loading, error, not-found, robots, sitemap and manifest routes.

## Problems found and fixed

### Reliability and security

- Detail API 404 responses previously became 500 errors. Added `apiGetOptional()` and applied it to match, player, team, tournament and news details.
- CMS article HTML was rendered without sanitization. Added a conservative allow-list sanitizer before `dangerouslySetInnerHTML`.
- Public news could expose records explicitly marked `isPublished: false`. Added frontend defense-in-depth filtering and made direct draft URLs return not-found.
- Admin category management showed `0` articles for every category: it requested `limit=200`, which the API rejects with `400 limit must not be greater than 100`, and the catch handler turned that failure into empty data. Added `fetchAllNewsAdmin()` to collect articles page by page within the API limit, and the table now shows an explicit unavailable state with retry instead of misleading zero counts.
- Hardened that public-news guard to fail closed: only records explicitly marked `isPublished: true` now render in lists or detail pages. Live verification confirmed the current draft is absent from `/news`.
- One failed homepage request crashed the whole homepage. Changed independent homepage requests to graceful `Promise.allSettled` handling.
- API response handling now supports `204`, successful non-JSON responses and `FormData` without manually setting multipart `Content-Type`.
- Collection request failures no longer silently look like empty data on matches, teams, players, tournaments and schedules; retryable error states are shown.
- Placeholder contact, newsletter, social and app-download actions no longer pretend to work.

### Pagination and URL state

- Added API-backed, URL-controlled pagination to public news.
- Added server-side API pagination, search and category filtering to admin articles.
- Unified public/admin pagination while preserving nearby pages, ellipses, Previous/Next states, `aria-current`, valid page bounds and `Showing X–Y of Z`.
- Added totals to matches, teams, players, tournaments, schedules and PSL fixture pagination.
- Schedule date, tab and both page values now use URL query parameters so Back/Forward navigation works.
- Filters reset pages to 1 where supported.
- Admin comments no longer issue the invalid fake “all comments” request; the UI requires the target type and ID supported by the backend.

### Design and consistency

- Redesigned all auth screens with the PakCricZone cricket image split layout, responsive form panel, restrained brand styling and optimized local image.
- Removed the auth button glow and aligned its action styling with the shared visual system.
- Removed the remaining colored glow across the app, which was most visible in dark mode: the hero call-to-action, filter tabs, favorites action, scroll-to-top button and match/team/player/tour/tournament/schedule cards no longer use `shadow-accent`, `hover:shadow-xl` or lift-on-hover effects. Hover now uses border, background and text colour changes with at most `shadow-sm`, and radii were pulled back to the restrained scale.
- Enhanced the homepage: live matches were previously fetched but only used by the ticker, so a "Live Now" section now surfaces them as real match cards, and a "Top Performers" section shows PSL leading run scorers and wicket takers from the existing `/psl/leaders` endpoint.
- Removed the homepage "Popular Teams" section. It had no popularity ranking and simply showed the first six teams from the API.
- Rebuilt the schedule/results cards on the same compact scoreboard pattern as match cards, replacing the centred VS emblem, stacked logos, coloured callout panels and innings box with team rows, a single result line and a thin meta footer. The schedule page header and date controls were also flattened to the shared restrained styling.
- Replaced the admin article "Tags (comma separated)" text field with a tag editor: tags are stored as an array, added with Enter, comma or an Add button, shown as removable chips with accessible remove labels, de-duplicated case-insensitively, and the last tag can be removed with Backspace.
- Rebuilt match cards into a denser scoreboard layout: tournament and status on top, compact team rows, and a thin meta footer for date/live/result. Removed oversized padding, equal-height stretch gaps, VS columns and hover lift. Match page header and grid spacing were tightened to match.
- Centralized semantic statuses and wording, including unknown-status handling instead of treating unknown matches as completed.
- Unified admin/public pagination and admin header hierarchy.
- Canonicalized article administration under `/admin/news`; `/admin/articles` now redirects.
- Removed the misleading publishing checkbox; explicit “Save Draft” and “Publish Live” actions remain.
- Removed dead imports, dead filters and obsolete duplicate logic identified by lint.
- Cleaned HTML from news excerpts/read-time calculations, fixing visible `<p>` markup in cards.
- Refreshed the news page with filter tabs above the spotlight, a restrained editorial spotlight, clearer title/thumbnail hierarchy and cleaner category/tag placement. Filters now visibly govern both the spotlight and story grid, and a spotlight-only result no longer produces a contradictory empty state.
- Converted local auth/PSL imagery to `next/image`.

### Accessibility and responsive behavior

- Added public/admin skip links and main-content targets.
- Added `aria-current` to navigation and pagination.
- Added accessible names/expanded states to mobile, theme and icon controls.
- Added Escape handling for menus and confirmation dialogs, initial dialog focus and dialog descriptions.
- Added contact field label associations.
- Fixed the mobile logo wrapping and constrained auth grid children.
- Verified true 375px mobile layouts using browser device emulation.
- Linked the registration Privacy Policy text to the actual policy route.
- Added a visible search loading fallback and a homepage link on the global error screen.
- Wired category links to preselect the category in the article editor.

### SEO and Next.js

- Added `metadataBase`.
- Added `noindex` metadata for auth/admin routes and expanded robots exclusions.
- Expanded the sitemap with missing static, news-detail and tournament-detail routes.
- Preserved route-specific live/stable revalidation.
- Fixed a Server/Client boundary issue discovered during browser/build validation.
- Added deterministic Pakistan date/time helpers using `Asia/Karachi`.

### Schedule page failure, hero readability and team cards

- Diagnosed the "Unable to load content / The schedule is temporarily unavailable." error. The API was returning **HTTP 429**, not failing data: the API allows 100 requests per minute per client, the URL-sync effect in `SchedulesPageClient` listed `date` in its own dependency array and rewrote page state on every render, and each day change fired two requests, so stepping through days quickly exhausted the whole request budget.
- Fixed the effect so URL state is only written when it actually differs, debounced the day fetch by 250ms so rapid date stepping issues one request pair for the final day only, and added a single automatic retry after 1.5s when a 429 is returned.
- Rate limiting now reports itself accurately instead of being reported as unavailable data. `ScheduleBoard` takes `errorMessage` instead of a boolean `error`, so the throttled case explains that too many requests were sent.
- Found that `/api/schedules/{date}` only reads `SportEventRecord` rows of kind `daily_schedule`, which the provider ingestion job has never populated for any date probed, while `daily_results` rows do exist for some dates (15 rows for 2026-09-05). The Schedule tab therefore falls back to the real `/api/matches` endpoint, mapping those fixtures into the same record shape. No mock data is involved; both tabs show genuine API data. All matches are loaded once and cached for five minutes so browsing days costs no extra requests.
- Fixed two result-card rendering bugs exposed once real records rendered: the tournament label showed "MATCH" because provider payloads carry the competition under `season` / `sport_event_context` rather than `tournament`, and one side's score showed `0` because only the first innings entry was read while providers pad the non-batting side with 0. Side totals are now summed per innings with wickets, so a card reads `136/8` vs `193/4` alongside "Ace Capital CC won by 57 runs".
- Made the hero quick-link cards readable over the hero photograph: they had lost their backdrop blur during the de-glow pass, so labels sat directly on a busy image. They now use `bg-black/65` with `backdrop-blur-md` and a brighter sub-label.
- Rebuilt `TeamCard` on the shared compact pattern: a single row with a 44px crest, team name, abbreviation, location and a chevron, replacing the tall centred emblem card with its blur flare, glow ring and gradient hover. The teams grid moved to three columns with 12px gaps and skeleton placeholders that match the new card height.

### Players directory and team/player details

- Rebuilt `PlayerCard` to match the compact team-card language: 48px portrait/initials, player name and role on one line, team and nationality metadata below, and a restrained chevron action. Removed the decorative glow, oversized centred portrait, shadow and redundant action footer.
- Flattened the players directory header to the approved 4px–6px radius style, reduced title typography to the shared page-title scale, tightened filters and spacing, changed the listing to a three-column compact grid and added card-shaped loading skeletons.
- Redesigned player detail headers without gradient banners or glow rings. The player portrait, identity, role, nationality, styles, team link, favorite and share controls remain available in a denser layout.
- Added a backwards-compatible compact mode to `StatCard` and used it for player profile fields, avoiding the oversized numbers and large gaps while leaving other existing `StatCard` consumers unchanged.
- Redesigned team detail headers and overview cards to the same restrained layout. Team crest, country/code, actions and roster/match counts are preserved without decorative blur or oversized typography.
- Hardened team-match association so detail pages can recognize array-based team IDs/names and object-based home/away team shapes instead of assuming `match.teams` is always an array.
- Team squad grids now reuse the compact player cards in three columns.

### Tours and tournaments final pass

- Flattened the tours and tournaments directory headers to the same compact card used on teams/players: `text-2xl font-semibold` titles, restrained count pills, no gradient banners or blur blobs.
- Rebuilt tour and tournament cards as single-row compact items (trophy tile, title, region/format metadata, chevron) and moved both grids to three columns with 12px gaps. Tournaments now use card-shaped loading skeletons instead of a spinner panel.
- Tightened filter chips to `rounded` + `text-xs font-medium` and search inputs to `rounded-md` / `text-sm`.
- Aligned tournament detail with team/player profiles: breadcrumb, compact header with format/gender tags and season/result counts, season tiles, and result rows that reuse `StatusBadge` instead of oversized badges and gold result text. Empty seasons/results remain honest empty states when the API has no records.

### Live indicator consistency

- The homepage ticker rendered its own live pill at `text-xs font-black` while every other status used `<Badge>` at `text-[10px] font-bold`, so "LIVE" appeared visibly larger than "RESULT" in the same carousel.
- Live was also coloured with `accent2` (green) in several places even though the semantic badge mapping already assigns red (`--color-danger`) to the `live` status.
- Standardized on the single `LiveIndicator` component for every live pill and retuned it to red with the same padding, radius and typography as `Badge`, so live and non-live statuses are always the same size. It is now used by the ticker, schedule/result cards, match detail and live streams.
- Recoloured the remaining green live accents to red: the live innings line in `MatchCard`, and the hero "Live cricket" pulse dot. Green `accent2` usage that is unrelated to live status (wins, net run rate, boundaries, viewer counts, link hovers, success messages) was deliberately left unchanged.
- Added a shared `BlinkingDot` export in `components/Badge.tsx` that inherits the badge text colour, and a `dot` prop on `Badge`. `StatusBadge` now sets it automatically whenever the normalized status is `live`, so every live badge across public pages and the admin panel is fully rounded with a blinking dot from one place.
- Applied the same treatment to the badges that do not flow through `StatusBadge`: the admin dashboard live-matches metric pill (now a rounded pill with a blinking dot instead of animating the whole pill) and the favorites match card badge.
- Admin article publish pills ("Live"/"Draft") also received the blinking dot for the published state, but kept their success/warning colours because there "Live" means published rather than a match in progress.

### One reusable live badge

- Two different live treatments still existed: the ticker pill (`LiveIndicator`, an expanding ring) and the status badge dot (`live-pulse`). The badges in "Live Now", the matches Live tab and the schedule therefore looked static next to the ticker even though both claimed to be live.
- The `live-pulse` keyframe was also still animating a green glow (`rgba(0, 230, 118, …)`) left over from when live was green, and only dipped opacity to 0.7, which is too subtle to read as blinking. It now blinks between full and 25% opacity with no colour of its own.
- `LiveIndicator` is now the single live badge and owns `BlinkingDot` (an expanding ring plus a blinking core, both in `currentColor`). `Badge` re-exports the dot, and `StatusBadge` returns the `LiveIndicator` pill whenever the normalized status is live, so every live label on the site is literally the same element instead of two lookalikes.
- Removed the last hand-rolled live dots: the innings line in `MatchCard` and the favorites match badge (now `StatusBadge`). The `dot` prop on `Badge` was dropped since live no longer flows through it, leaving one path.
- The login artwork pill keeps its own dark translucent surface because it sits directly on a photo where the red-on-red pill lost contrast, but it now uses the shared `BlinkingDot` so the animation matches.

### PSL fixture status colours

- The PSL fixtures table already used `StatusBadge`, but the provider stores finished matches as `closed` rather than `completed`. The label was remapped to "Completed" while the tone stayed `neutral`, so every result looked grey.
- `normalizeStatus` now aliases `closed`/`ended` to the completed (green) tone and `not_started` to upcoming (blue). Cancelled uses the danger (red) tone instead of muted grey so it is distinguishable from completed at a glance. The same mapping applies anywhere `StatusBadge` is used.

### Sponsored placements

- The previous `AdBanner` component shipped invented advertiser copy ("PSL 2026 Tickets", "Cricket Merchandise") with "Buy Now" buttons that did nothing, which reads as real inventory to a visitor and conflicts with the no-fake-functionality rule. It also used gradients, blur flares and lift-on-hover, all of which the design pass had removed elsewhere.
- Replaced it with `src/components/AdSlot.tsx`: a single reserved space that carries a "Sponsored" label, states plainly that the space is available, and shows the creative size it is sized for. It is a plain server-safe component with no client boundary and no new dependencies.
- Each format reserves a fixed height (`leaderboard` 728×90, `inline` 468×120, `rectangle` 300×250) so inserting a real creative later cannot shift the page, and every placement carries a `data-ad-slot` identifier (for example `news-detail-mid`) so an ad script can target positions without further markup changes.
- Inside news articles the sponsored space sits mid-content: the sanitized article HTML is split at a paragraph boundary near its midpoint, so the slot lands between paragraphs rather than breaking markup. Articles with fewer than three paragraphs render whole and skip the in-article slot so it never appears directly under the heading.
- Each slot now shows a placeholder creative fetched at its exact dimensions from `picsum.photos`. The URL is seeded from the slot id (`/seed/news-detail-mid/468/120`), so every position gets a different image while the server and client render the same URL — a per-load random URL would mismatch on hydration and flicker. If the image cannot load the slot falls back to the "Ad space available" state, and a corner tag marks it as a placeholder so it is never mistaken for sold inventory.
- The unit is capped at its creative width and centred, so the dashed frame hugs the image instead of leaving empty gutters in a wider column.
- The PSL and Tours pages carry three leaderboards each: top (under the season filter / above the directory), middle, and bottom. On Tours the middle one is a grid child spanning the full row after the sixth card, so it breaks on a row boundary in both the two and three column layouts; lists shorter than twelve tours skip it so it cannot land near the end of the results.
- Other placements: news article sidebar and news listing, homepage (between upcoming matches and the PSL spotlight, and above the newsletter), matches, schedule, teams, players and tournaments listings below the grid, the shared news sidebar, and the live streams page under the player. Listing slots sit inside the results branch, so they are absent from empty and error states.

## Functional verification

- All 24 sampled public/auth/admin route entries returned HTTP 200 from the local frontend.
- Browser checks covered homepage, matches, news, schedules and login without final runtime or hydration exceptions.
- Protected `/admin` correctly redirected an unauthenticated browser to login with an internal `returnTo`.
- Search, favorites, comments, sharing and destructive API mutations were inspected but not executed against unknown data.
- Invalid detail pages now render Next.js not-found content; streamed App Router responses may retain HTTP 200 while applying noindex.

## Validation results

- `npm run lint`: passed with 0 errors. Remaining 20 warnings are existing dynamic remote `<img>` usages; converting them safely needs a reviewed remote-image host policy.
- `npx tsc --noEmit -p tsconfig.json`: passed.
- `npm run build`: passed; 43 routes generated.
- Frontend tests: no test files or frontend test script exist.
- Browser console sampling: no final runtime/hydration errors after fixing the Newsletter client boundary.
- `git diff --name-only`: confirmed every changed file is under `apps/web/`.

## Visual proof

- `apps/web/audit-home-light.png`
- `apps/web/audit-home-dark.png`
- `apps/web/audit-matches-desktop.png`
- `apps/web/audit-news-desktop.png`
- `apps/web/audit-news-redesign.png` (filtered Highlights view after the latest news layout pass)
- `apps/web/audit-detail-page.png`
- `apps/web/audit-mobile-public.png`
- `apps/web/audit-mobile-login.png`
- `apps/web/audit-admin-protected-dark.png`
- `apps/web/audit-admin-protected-mobile.png`
- `apps/web/audit-hero-blur.png` (hero quick-link cards readable over the photo)
- `apps/web/audit-teams-card.png` (compact team cards)
- `apps/web/audit-schedule-data.png` (schedule tab populated from the matches endpoint)
- `apps/web/audit-schedule-results2.png` (results tab with corrected tournament names and innings totals)
- `apps/web/audit-players-redesign.png` (compact players directory)
- `apps/web/audit-player-detail-redesign.png` (restrained player profile)
- `apps/web/audit-team-detail-redesign.png` (restrained team profile)
- `apps/web/audit-tours-redesign.png`
- `apps/web/audit-tournaments-redesign.png`
- `apps/web/audit-tournament-detail-redesign.png`
- `apps/web/audit-ads-news-detail.png` (in-article and sidebar sponsored spaces)
- `apps/web/audit-ads-matches.png` (leaderboard sponsored space above pagination)
- `apps/web/audit-live-unified-home.png` (ticker and "Live Now" badges rendering the same live pill)
- `apps/web/audit-live-unified-matches.png` (matches Live tab)
- `apps/web/audit-live-unified-login.png` (login artwork pill with the shared blinking dot)
- `apps/web/audit-ads-images-article.png` (468×120 in-article and 300×250 sidebar placeholder creatives)
- `apps/web/audit-psl-fixtures-status.png` (PSL fixtures table with coloured status badges)
- `apps/web/audit-ads-psl.png` (PSL top leaderboard)
- `apps/web/audit-ads-tours.png` (Tours top and mid-list leaderboards)

Authenticated admin dashboard/table screenshots were not fabricated because no admin credentials were supplied. The protected-route screenshots prove the unauthenticated behavior.

## Remaining backend-only blockers

- JWT storage remains in `localStorage`; secure httpOnly cookie sessions require backend contract changes.
- A true server-side admin route guard requires a server-readable session/cookie.
- Public draft exclusion must also be enforced by the news API; frontend filtering is defense-in-depth only.
- Admin-wide comment listing and admin deletion require dedicated endpoints. The comments page now clearly presents this as a backend requirement, lists the required protected list/delete contracts and avoids showing a misleading target-ID moderation table.
- Users/roles, media uploads, settings and full category CRUD have no backend endpoints.
- `daily_schedule` records are missing from `SportEventRecord` for every date probed, so `/api/schedules/{date}` returns zero rows. The provider ingestion job that writes these records needs to run; until then the Schedule tab is served from `/api/matches`, which lacks a date filter and so requires the full match list to be loaded and filtered on the client.
- Teams and tournaments lack backend search/filter parameters; current filtering can only describe the loaded page.
- Player role filtering, global cross-entity search, batch favorites and API-side PSL fixture pagination need backend support.
- Contact and newsletter submissions require backend endpoints and remain visibly unavailable.
- No ad server or sponsorship API exists, so the sponsored placements show placeholder creatives from a third-party image service. Real inventory needs either an ad network script or a backend campaign/creative endpoint; the `data-ad-slot` identifiers are the integration points, and the placeholder image plus its corner tag should be removed at that point.

## Main files changed

- Shared/API: `src/services/api/client.ts`, detail/news services, `src/components/Badge.tsx`, `Pagination.tsx`, `ErrorState.tsx`, `src/utils/sanitizeHtml.ts`, `src/utils/helpers.ts`.
- Public: homepage, news, schedule, collection boards, match status components, navbar, footer, logo, newsletter and contact.
- Sponsored: `src/components/AdSlot.tsx` added; `src/components/AdBanner.tsx` removed and all three of its usages migrated.
- Auth: shared auth shell/form and auth metadata.
- Admin: shared header/dialog/pagination, layout, dashboard, comments, article manager/editor and article route redirect.
- SEO: root metadata, robots and sitemap.
