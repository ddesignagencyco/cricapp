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

## Main files changed

- Shared/API: `src/services/api/client.ts`, detail/news services, `src/components/Badge.tsx`, `Pagination.tsx`, `ErrorState.tsx`, `src/utils/sanitizeHtml.ts`, `src/utils/helpers.ts`.
- Public: homepage, news, schedule, collection boards, match status components, navbar, footer, logo, newsletter and contact.
- Auth: shared auth shell/form and auth metadata.
- Admin: shared header/dialog/pagination, layout, dashboard, comments, article manager/editor and article route redirect.
- SEO: root metadata, robots and sitemap.
