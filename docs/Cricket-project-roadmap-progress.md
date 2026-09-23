# CricApp — Project Roadmap & Task Tracker

> **Purpose:** This file is the single source of truth for project progress. It is structured in phases, each broken into **Frontend**, **Backend**, and **Ingestion** task groups. Check a box (`- [x]`) when that task is verified complete. This file is meant to be read and updated by AI coding agents as well as humans — keep task descriptions atomic and unambiguous so an agent can pick up any unchecked box and know exactly what "done" means.
>
> **Baseline source:** Progress Report dated Sep 8, 2026 (Day 8 of development).
> **Last updated:** Sep 23, 2026 — codebase review: prediction frontend (Phase 13.5), interactive tools (Phase 15), and AI assistant entity linking + chat UI (Phase 16) verified done. Live Sportradar poll still depends on a working API key.

**Legend:**
- `[x]` = Complete / verified
- `[ ]` = Not started or incomplete
- `[~]` = Partially done (see notes under the task)

---

## PHASE 1 — Architecture & Project Foundation

### 1.1 Monorepo & Structure
- [x] Set up monorepo with `apps/web`, `apps/api`, `services/ingestion`, `services/prediction`, `packages/shared-types`
- [x] Ensure each service is independently deployable
- [x] Create `@cricapp/shared-types` package (canonical types, Redis key factories, PSL config)

### 1.2 Dev Environment & CI/CD
- [x] Docker Compose for local dev (Postgres + Redis)
- [x] Docker Compose for production (full stack with health checks)
- [x] Dockerfiles for API service
- [x] Dockerfiles for Ingestion service
- [x] GitHub Actions CI — lint + test on PR
- [x] PR template
- [x] `.env.example` files for each service
- [x] Environment variable documentation
- [ ] Auto-deployment pipeline (CD) — currently manual deployment only
- [ ] Staging / preview environment

---

## PHASE 2 — Backend API Core Infrastructure

### 2.1 Backend (`apps/api`)
- [x] NestJS application bootstrap with TypeScript
- [x] Prisma ORM integration with PostgreSQL
- [x] Redis clients created in constructor so `LiveService` can subscribe on boot (fixed `subscriber.on` crash)
- [x] Global API Key auth guard (`x-api-key` header / `api_key` query param)
- [x] Rate limiting via `ThrottlerGuard` (configurable TTL/limit)
- [x] Request logging middleware
- [x] Swagger/OpenAPI docs at `/docs` (8 tag groups)
- [x] Health check endpoints: `GET /` (HTML), `GET /health/json`
- [x] `PaginationQuery` DTO for consistent pagination
- [x] Pagination applied to Teams listing
- [x] Pagination applied to Tournaments listing
- [x] Pagination audit — all list endpoints now return `{ data, meta }` (Teams, Players, Matches, Tournaments, PSL leaders/squads/standings/schedule, Schedules)
- [x] User authentication system (JWT-based, for end users — separate from API key guard)
- [x] HttpOnly session cookie (`cricapp_access_token`); Bearer still accepted for tests/legacy
- [x] `POST /auth/logout` clears the session cookie
- [x] Signup does **not** issue a session; login requires `emailVerified`
- [x] User accounts/profiles module (DB models + `/auth` endpoints)
- [x] `PATCH /auth/me` — update displayName, avatarUrl, username
- [x] Protected superadmin (`isSuperAdmin`) — cannot be deleted or demoted; seed via `SUPERADMIN_*`

---

## PHASE 3 — Ingestion Service (Sportradar Integration)

### 3.1 Core Client
- [x] HTTP client with rate limiting (token bucket algorithm)
- [x] Retry logic with exponential backoff + jitter
- [x] Request timeout handling
- [x] 20+ Sportradar endpoints integrated

### 3.2 Sync Jobs
- [x] Live match polling (`poll.js`) — 15s live / 60s idle — **blocked in prod/dev until a fresh Sportradar key (trial 429)**
- [x] Ball-by-ball timeline sync — delta via `poll.js`, full via `refSync.js`
- [x] PSL standings sync (`pslSync.js`)
- [x] PSL fixtures sync (`pslSync.js`)
- [x] PSL leaders sync (`pslSync.js`)
- [x] PSL squads sync (`pslSync.js`, per season)
- [x] Tours sync (`refSync.js`, 7-day cadence)
- [x] Tournaments sync (`refSync.js`, 7-day cadence)
- [x] Tournament seasons sync (`refSync.js`, 7-day cadence)
- [x] Team profiles sync (`refSync.js`, 7-day cadence)
- [x] Player profiles sync (`refSync.js`, 7-day cadence)
- [x] Team schedule/results sync (`refSync.js`, 6–24hr cadence)
- [x] Daily schedule/results sync (`refSync.js`, daily)
- [x] Head-to-head sync (`refSync.js`, 7-day cadence)
- [x] News/feed content sync (`newsSync.js`) — RSS/Atom fetcher, parser, normalizer, deduplication, PostgreSQL upserts, Redis cache invalidation, scheduled sync
- [~] Live streams metadata sync — `streamsSync.js` upserts from `STREAM_SOURCES` JSON env; no licensed stream provider wired yet
- [x] Ingestion Redis heartbeat (`ingestion:heartbeat`) written after each poll cycle
- [x] Startup order: live poll first; PSL and reference sync delayed so 1 QPS quota is not starved
- [x] Sportradar 429 backoff capped (max 15s) with retry logs

### 3.3 Normalization, Diffing & Persistence
- [x] `CanonicalMatch` normalization from raw Sportradar payloads
- [x] Lineup normalization into teams + players
- [x] Persist raw match lineups (`kind = 'match_lineup'` on `sport_event_records`) for prediction XI
- [x] Event diffing (started, status_change, runs, wicket, milestone)
- [x] Redis pub/sub for real-time event publishing
- [x] PostgreSQL upserts for 13+ tables
- [x] Redis cache with TTL management
- [x] `publishMatchState` after reference `saveSportEventRecords` so completed matches leave Redis `matches:live`
- [x] Staleness tracking per data category

### 3.4 Testing
- [x] Unit tests — normalization (`test/normalize.test.js`)
- [x] Unit tests — diffing (`test/diff.test.js`)
- [x] Unit tests — PSL normalizers (`test/psl.test.js`)
- [x] Unit tests — reference normalizers (`test/reference.test.js`)
- [x] Integration tests for full sync pipeline (`test/integration.test.js`) — mock Sportradar → `pollOnce()` → DB + Redis verified
- [x] Prediction worker unit tests (`services/prediction/test/*`) — scoring, features, live, settle, auto-calibration
- [x] CI job `Test prediction` (`npm run test --workspace @cricapp/prediction`)

---

## PHASE 4 — Backend API Endpoints (Data Delivery)

### 4.1 Matches Module — Backend
- [x] `GET /matches`
- [x] `GET /matches?q=` text search (teams, tournament, venue, score)
- [x] `GET /matches/live` — Postgres `status === live` is source of truth; stale Redis IDs are filtered (completed matches no longer leak)
- [x] `GET /matches/:matchId`
- [x] `GET /matches/:matchId/timeline`
- [x] `GET /matches/live/stream` (SSE)
- [x] `GET /matches/:matchId/stream` (SSE)
- [x] Socket.IO `/matches` namespace — global `live:update` plus per-match rooms (`subscribe:match` / `match:update`)

### 4.2 Teams Module — Backend
- [x] `GET /teams`
- [x] `GET /teams?q=` text search (name, abbr, country)
- [x] `GET /teams/:idOrAbbr`
- [x] `GET /teams/:idOrAbbr/players`
- [x] `GET /teams/:idOrAbbr/schedule`
- [x] `GET /teams/:idOrAbbr/results`

### 4.3 Players Module — Backend
- [x] `GET /players` (search by `q` / team)
- [x] `GET /players/:playerId`

### 4.4 PSL Module — Backend
- [x] `GET /psl/seasons`
- [x] `GET /psl/standings`
- [x] `GET /psl/schedule`
- [x] `GET /psl/leaders`
- [x] `GET /psl/squads`

### 4.5 Tours & Tournaments — Backend
- [x] `GET /tours` — paginated `{ data, meta }` (`page`, `limit`)
- [x] `GET /tournaments`
- [x] `GET /tournaments?q=` text search by name
- [x] `GET /tournaments/:tournamentId`
- [x] `GET /tournaments/:tournamentId/seasons`
- [x] `GET /tournaments/:tournamentOrSeasonId/results`

### 4.6 Schedules & Head-to-Head — Backend
- [x] `GET /schedules/:date`
- [x] `GET /schedules/:date/results`
- [x] `GET /head-to-head/:teamAId/:teamBId`

### 4.7 News/Feed Module — Backend
- [x] Design News DB schema (articles, categories, publish date, author/source)
- [x] `POST/GET/DELETE/PATCH` admin CMS endpoints for news content
- [x] Category CRUD — `GET/POST /news/categories`, `GET/PATCH/DELETE /news/categories/:idOrSlug`
- [x] `GET /news` — list endpoint with pagination/filtering
- [x] `GET /news/:idOrSlug` — single article by ID or SEO slug
- [x] Public list/detail hide unpublished drafts (`isPublished: true` only)
- [x] Article title limited to 50 words (backend validation)
- [x] SEO slugs on articles and categories (optional explicit slug; otherwise generated)
- [x] Unicode SEO slugs generated from Urdu news titles
- [x] Language field (`en` / `ur`) + `?language=` filter
- [x] SEO fields on articles (`metaTitle`, `metaDescription`, `canonicalUrl`)
- [x] Author model + `GET/POST /admin/authors`, `PATCH /admin/authors/:id`
- [x] Article–entity links (players, teams, matches, series) + query filters — **API only**; CMS pickers removed from the news editor for now
- [x] `GET /admin/news` includes drafts for CMS
- [x] `POST /admin/media/upload` — Cloudinary image upload (admin; JPEG/PNG/WebP/GIF/AVIF, 10 MB)
- [x] Removed `isFeatured`, `isBreaking`, and article `tags` — categories are the taxonomy
- [x] Smoke-tested: publish article then fetch by slug and list

### 4.13 Search Module — Backend
- [x] `GET /search?q=` unified search (`players`, `teams`, `matches`, `tournaments`)
- [x] Integration tests for `/search` and `/teams?q=`
- [x] Smoke-tested against running API (`q=lahore` returns Lahore Qalandars)

### 4.8 Live Streams Module — Backend
- [x] Design Streams DB schema (stream URL/provider, match link, status, scheduled time)
- [x] `GET /streams` — list active/upcoming streams
- [x] `GET /streams/:streamId` — stream detail endpoint
- [x] Stream comments while watching — `GET/POST /streams/:id/comments` (`targetType: stream`)

### 4.9 Push Notifications — Backend
- [x] Choose provider — Firebase Cloud Messaging (FCM)
- [x] Device/token registration endpoint (`/devices`)
- [x] Notification trigger service (match start, wicket, milestone, match end)
- [x] Notification preferences endpoint (per user/device)
- [x] Redis live-event bridge (`MatchEventBridgeService`) → FCM
- [x] Favorite-aware dispatch (match or playing-team favorites)
- [x] `GET /notifications/history` in-app notification log
- [ ] End-to-end FCM send with live Firebase credentials (blocked until live poll + FCM env)

### 4.10 Favorites / Bookmarks — Backend
- [x] DB schema for user favorites (teams, players, matches)
- [x] `POST/DELETE /favorites` endpoints
- [x] `GET /favorites` endpoint (requires auth)
- [x] `GET /favorites?expand=true` returns nested team/player/match objects
- [x] Admin analytics include favorite totals grouped by `targetType` (team / player / match, plus any extra types)

### 4.11 Comments / Reactions — Backend
- [x] DB schema for comments + reactions (linked to match/news/stream)
- [x] `POST /comments` endpoint (`targetType`: match, news, stream)
- [x] `GET /comments` endpoint with pagination
- [x] Nested stream comments — `GET/POST /streams/:id/comments`
- [x] `POST/GET /reactions` endpoints
- [x] Moderation/reporting — `POST /comments/:id/report`, admin queue, approve/hide/delete
- [x] `comments.status` + `comment_reports` applied in Prisma migrations

### 4.12 Social Sharing — Backend
- [x] Share-link generation endpoint with OG meta support (`/share/:type/:id`)
- [x] Share analytics tracking (`share_stats` increment on share link hit; totals in `/admin/analytics`)
- [x] `GET /admin/analytics` — counts for users, matches, teams, players, tournaments, tours, comments, streams, reports, articles, shares; favorites as `{ total, types }`

### 4.14 Newsletter, Contact & Gallery — Backend
- [x] Newsletter subscription model + `POST /newsletter/subscribe`
- [x] Opaque-token unsubscribe + `POST /newsletter/unsubscribe`
- [x] Admin subscriber list — `GET /admin/newsletter/subscribers`
- [x] Contact form persistence — `POST /contact` requires name, email, message
- [x] Admin contact queue + status update endpoints
- [x] Gallery media schema and paginated public list/detail APIs
- [x] Admin Cloudinary gallery upload/delete APIs
- [x] Gallery type filters: `image`, `short`, `video`
- [x] Cloudinary duration enforcement — shorts ≤30s, videos ≤60s; rejected assets deleted

---

## PHASE 5 — Frontend Pages & Core UI

### 5.1 Completed Pages — Frontend
- [x] `/` Home (hero, live matches carousel, upcoming, leaders, teams, news)
- [x] `/matches` — all matches (live/upcoming/completed)
- [x] `/matches/[id]` — match detail (scorecard, timeline)
- [x] `/psl` — PSL hub (points table, performers, franchises, fixtures)
- [x] `/teams` — teams directory
- [x] `/teams/[id]` — team detail (profile, roster, matches)
- [x] `/players` — players directory
- [x] `/players/[id]` — player detail (bio, stats, team, recent matches)
- [x] `/points-table` — full PSL points table
- [x] `/stats` — PSL statistical leaders
- [x] `/search` — search results
- [x] `/about` — static page
- [x] `/contact` — static page
- [x] `/privacy` — static page
- [x] `/terms` — static page
- [x] `/streams` — `LiveStreamsBoard` uses `GET /streams`; listed in Navbar + Footer
- [x] `/gallery` — images, shorts, videos, stories from news + streams

### 5.2 Missing Frontend Pages (Backend endpoints already exist)
- [x] `/head-to-head` or `/matches/[id]/head-to-head` — dedicated head-to-head comparison page
- [x] `/teams/[id]/schedule` or tab — team detail `Fixtures` + `Results` tabs from `/teams/:id/schedule` and `/teams/:id/results`
- [x] `/schedules/[date]` — daily schedule/results dedicated page
- [x] `/tours` — tours listing page with `GET /tours` pagination (`page`, `limit`; 20 per page)

### 5.3 Reusable Board Components — Frontend
- [x] `HomeHero`
- [x] `LiveBoard`
- [x] `MatchBoard`
- [x] `MatchDetailBody`
- [x] `NewsBoard`
- [x] `NewsDetailBody`
- [x] `PlayerDirectory`
- [x] `PlayerDetailBody`
- [x] `PointsTableBoard`
- [x] `SearchResultsBody`
- [x] `StatsBoard`
- [x] `TeamDetailBody`
- [x] `TeamsDirectory`
- [x] `LiveStreamsBoard`
- [x] `ContactBody`

### 5.4 Shared Components — Frontend
- [x] `Navbar` (search, theme toggle, mobile menu, account icon + profile dropdown; Urdu nav links removed — language stays on News)
- [x] `Footer`
- [x] `SearchBar`
- [x] `MatchCard`
- [x] `LiveMatchCard` (animated)
- [x] `LiveMatchesCarousel`
- [x] `LiveIndicator`
- [x] `TeamCard` / `TeamLogo`
- [x] `PlayerCard`
- [x] `PointsTable`
- [x] `ScoreBoard`
- [x] `ScorecardTable`
- [x] `OverTimeline` / `BallTracker`
- [x] `StatCard`, `Badge`, `SectionHeader`, `FilterBar`, `Tabs`
- [x] `ThemeProvider` (dark/light)
- [x] `LoadingSkeleton`, `EmptyState`, `ScrollToTop`
- [x] `AdBanner`, `ShareButton` (wired to `GET /share/:type/:id` via `services/sharing.ts`)

### 5.5 SEO & PWA — Frontend
- [x] Dynamic sitemap generation
- [x] `robots.txt`
- [x] JSON-LD structured data
- [x] PWA manifest
- [x] Metadata on all pages

### 5.6 UX Features — Frontend
- [x] Dark/light theme with toggle
- [x] Responsive/mobile-first design
- [x] Mobile hamburger menu
- [x] Scroll-to-top button
- [x] Loading skeletons
- [x] Error boundary

### 5.7 Admin CMS — Frontend (`/admin`)
- [x] Overview dashboard — KPI cards from `GET /admin/analytics` (users, matches, teams, players, tournaments, tours, comments, streams, reports, articles, shares; favorites total + team/player/match type chips)
- [x] Articles list/create/edit (`NewsManager`, `NewsEditor`) with colored action icons
- [x] News editor mirrors API rules: title 1–50 words, optional kebab slug, `en`/`ur` language under category, required body
- [x] Linked-entity pickers (`playerIds` / `teamIds` / `matchIds` / `seriesIds`) and Featured/Breaking checkboxes removed from CMS (not needed in the UI; featured/breaking were never API fields)
- [x] Cover image + TipTap image button open Cloudinary gallery (`POST /admin/media/upload`); recent uploads kept in the browser (no list API)
- [x] Media Library page + author avatar gallery use the same upload flow
- [x] Categories, authors, comments/reports
- [x] Users — admin/verified toggles + pagination; **superadmin row is labels only** (no toggles, no delete)
- [x] Matches, teams, players, tournaments (avatars + pagination)
- [x] Streams CMS (create/status/delete + pagination)
- [x] Shared toast UI restyled to the blue theme (top-right)

---

## PHASE 6 — Frontend ↔ Backend Real Data Integration

- [x] Matches (live, upcoming, completed) — connected to real API
- [x] Teams (directory, detail, roster) — connected to real API
- [x] Players (directory, detail) — connected to real API
- [x] PSL (standings, fixtures, leaders, squads) — connected to real API
- [x] Search (matches) — connected to real API
- [x] Search (teams) — connected to real API
- [x] Search (players) — connected to real API
- [x] Search (tournaments) — connected to real API
- [x] Tournaments page — connected to real API (backend endpoint already exists)
- [x] News — real backend API exists (Phase 4.7 complete)
- [x] Streams — `LiveStreamsBoard` + `/streams` page use `GET /streams` (Phase 4.8)
- [x] Tours — `/tours` uses paginated `GET /tours` (Phase 4.5)

---

## PHASE 7 — News / Editorial Module (End-to-End)

### 7.1 Backend (done)
- [x] **Ingestion:** RSS/Atom sync (`newsSync.js`) — parser, normalizer, dedup, Postgres upserts, Redis invalidation
- [x] **Backend:** `/news` public + admin CMS endpoints (see Phase 4.7)
- [x] Public unpublished-draft filter
- [x] Language / SEO fields; categories (not featured/breaking flags or tags)
- [x] Author profiles (admin CRUD)
- [x] Article links to players, teams, matches, series (API + public related-news filters; CMS no longer edits links)
- [x] Cloudinary media upload for article images
- [x] `GET /admin/ingestion-health` (Redis heartbeat, live-set, sync keys)

### 7.2 Editorial remaining — Backend
- [x] Production-ready `NEWS_SOURCES` RSS list for Pakistan/PSL/international feeds added to ingestion env template (deployment must set/copy the value)
- [x] Seed SRS category set (Breaking, Pakistan Cricket, PSL, International, Match News, Analysis, Features, Records, Interviews, Explainers)
- [x] Native Urdu authoring workflow — separately stored `en` / `ur` article rows linked by translation group
- [x] Public author pages API (`GET /authors`, `GET /authors/:slug` with article list)
- [x] Editorial/correction policy content API (public reads + admin upsert)
- [x] Push-notification draft + social-copy fields on articles
- [x] Google News sitemap endpoint (`GET /news/google-news-sitemap.xml`)
- [x] Article JSON-LD / NewsArticle payload helper (`GET /news/:idOrSlug/seo`)
- [x] `hreflang` pairs for linked `en` / `ur` article variants

### 7.3 Editorial remaining — Frontend
- [x] Wire `NewsBoard` and `NewsDetailBody` to real API instead of mock data
- [x] Unhide `/news` route from navigation once real data flows
- [x] Author profile pages — `/authors` and `/authors/[slug]` built from published news `authorRef` / bylines (no public `GET /authors` API)
- [x] Category-driven news list (tabs by category slug); featured/breaking flags removed from UI (they were never in the API)
- [x] Urdu (`/ur`, `/ur/news`) article routes + EN/اردو toggle (`GET /news?language=ur`)
- [x] QA: pagination, empty states, and image handling for articles — `Pagination` + `EmptyState` + `RemoteImage` on news list/detail

---

## PHASE 8 — Live Streams Module (End-to-End)

- [~] **Ingestion:** source live stream metadata/links — `streamsSync.js` + admin CRUD; licensed provider not wired
- [x] **Backend:** implement `/streams` endpoints (see Phase 4.8)
- [x] **Frontend:** wire `LiveStreamsBoard` to real API instead of mock data
- [x] **Frontend:** unhide `/streams` route from navigation once real data flows
- [x] **Frontend:** watch-page comments via `GET/POST /streams/:id/comments` (`CommentsSection` on featured stream)
- [ ] Legal/licensing check for stream embedding (confirm rights before going live)

---

## PHASE 9 — User System & Engagement Features

> *Only pursue this phase if confirmed as an SRS requirement.*

### 9.1 Authentication — Backend + Frontend
- [x] Backend: user auth system (signup/login/JWT + HttpOnly cookie session)
- [x] Backend: signup returns no token; unverified login is `403`
- [x] Backend: password reset via email **link token only** (`token` + `tokenId`; OTP removed)
- [x] Backend: branded CricApp verification + reset HTML; SMTP verified in local env
- [x] Backend: verification token is written before the async mail send (no orphaned FK)
- [x] Backend: password reset / email verification flow — `PasswordResetToken` + `EmailVerificationToken` models, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/verify-email`, `POST /auth/resend-verification`, `MailerService` with SMTP/SendGrid/Resend/console providers
- [x] Backend: `DELETE /admin/users/:id` with superadmin protection
- [x] Frontend: signup/login pages (cookie session; signup requires email verify before login)
- [x] Frontend: unverified login `403` shows resend-verification (`POST /auth/resend-verification`)
- [x] Frontend: password reset is email **link token only** (`token` + `tid`); OTP/code UI removed
- [x] Frontend: auth state via `GET /auth/me` + `POST /auth/logout` (HttpOnly cookie, not localStorage JWT)

### 9.2 User Accounts/Profiles — Backend + Frontend
- [x] Backend: user profile DB model + endpoints (Phase 2.1)
- [x] Backend: `PATCH /auth/me` profile update
- [x] Frontend: profile page (view/edit) — `/profile` updates displayName, username, avatarUrl via `PATCH /auth/me`

### 9.3 Favorites/Bookmarks — Backend + Frontend
- [x] Backend: endpoints (see Phase 4.10)
- [x] Frontend: "favorite" toggle UI on Team/Player/Match cards
- [x] Frontend: "My Favorites" dashboard page

### 9.4 Comments/Reactions — Backend + Frontend
- [x] Backend: endpoints (see Phase 4.11)
- [x] Frontend: comment thread UI on match/news detail pages and live streams (`targetType: stream`)
- [x] Frontend: reaction buttons (like/emoji) UI

### 9.5 Social Sharing — Backend + Frontend
- [x] Backend: share-link endpoint (see Phase 4.12)
- [x] Frontend: wire existing `ShareButton` component to backend/share APIs

### 9.6 Push Notifications — Backend + Frontend
- [x] Backend: notification system (see Phase 4.9)
- [x] Frontend: replace hardcoded mock notification dropdown in `Navbar` with real data — mock dropdown removed; `/settings/notifications` loads `GET /notifications/history` + devices
- [~] Frontend: notification permission prompt + settings UI — prefs / device list / history + `Notification.requestPermission` exist; no Firebase web SDK so a real FCM token is not registered

---

## PHASE 10 — Technical Debt & Code Quality

- [x] Remove legacy `cricketApi.ts` service layer; consolidate on new `services/*.ts` pattern — no `cricketApi` in `apps/web`
- [x] Fix `MatchStatus` TypeScript type to include `"cancelled"` (already present in JS schema)
- [x] Decide fate of hidden News/Streams pages — finished and unhidden in Navbar + Footer (Phase 7/8)
- [x] Full pagination audit across all list endpoints (see Phase 2.1)
- [x] Code review pass for consistent error handling across API modules — improved FK validation for news categories and comment reactions; auth endpoints use consistent `BadRequestException` / `UnauthorizedException` / `ConflictException`

---

## PHASE 11 — Testing & QA

- [x] Ingestion integration tests (full pipeline, see Phase 3.4)
- [x] Backend API integration/e2e tests per module — suites for auth, admin, news, tours, matches, streams, comments, predictions; isolated `cricapp_test` DB (`npm test` no longer truncates development data)
- [x] Prediction worker tests (prematch, live, features, settle, calibrate)
- [x] Manual API smoke (Sep 11, 2026): cookie login, unverified 403, category CRUD, 50-word title reject, tours pagination, live-match status filter, stream comments, admin analytics, Cloudinary upload `201`
- [x] Manual API smoke (Sep 10, 2026): search, signup + `/auth/me`, publish news + get by slug
- [ ] Frontend component tests for critical UI (ScoreBoard, LiveBoard, MatchDetailBody)
- [ ] End-to-end (E2E) tests across full user flows (e.g., Playwright/Cypress)
- [ ] Load testing for live match SSE streaming under concurrent users
- [ ] Manual QA pass against SRS requirements checklist

---

## PHASE 12 — Deployment & Launch Readiness

- [ ] Auto-deployment / CD pipeline (see Phase 1.2)
- [ ] Staging/preview environment (see Phase 1.2)
- [ ] Production environment provisioning (DB, Redis, hosting for web/api/ingestion)
- [ ] Domain, SSL, and CDN setup
- [ ] Monitoring & alerting (uptime, error tracking, ingestion job health)
- [ ] Backup & disaster recovery plan for PostgreSQL
- [ ] Final production smoke test
- [ ] Launch

---

## PHASE 13 — AI Prediction Centre (SRS Phase 4)

> Predictions must come from statistical / ML models on structured sports data. A language model may explain results but must not invent probabilities. Worker reads `matches` + related sports tables (not `tours` / `tournaments` catalogues). Model versions: `prematch-logit-v2`, `live-resource-v2`.

### 13.1 Schema & storage
- [x] `prediction_runs` table (matchId, timestamp, modelVersion, stage: pre_match | live)
- [x] `prediction_features` table (input snapshot JSON used for that run)
- [x] `prediction_results` table (winner probs, score range, top batter/bowler, XI, confidence band, live extras)
- [x] `prediction_calibrations` table (append-only Platt slope/intercept fits)
- [x] Do not delete or silently overwrite incorrect historical predictions

### 13.2 Pre-match prediction service (`services/prediction`)
- [x] Independently deployable worker (Postgres + Redis, 15-minute upcoming cycle, ~30-day horizon)
- [x] Feature extraction from sports DB (form, venue, H2H, PSL table, squad/lineup, leaders)
- [x] Match winner probability + confidence / calibration band (`low` / `medium` / `high`)
- [x] Projected first-innings score range persisted (not NULL)
- [x] Top batter and top wicket-taker probabilities (leader ranks + role prior)
- [x] Playing XI probability (confirmed `match_lineup` when ingested; else squad heuristic)
- [x] Pitch / venue / weather impact on score and win edge when provider text exists
- [x] Toss-adjusted prediction after toss
- [x] Auto-recalibration from settled pre-match runs (hourly Platt fit; skip if sample small or unchanged; lockable via env)

### 13.3 Live prediction service
- [x] Win probability updated on Redis live events (runs / wicket / status / match started)
- [x] Probability history by over / major event (`GET .../history` and `.../chart`)
- [x] Live projected score range persisted
- [x] Match momentum / pressure index
- [x] Partnership projection and wicket-risk (baseline heuristic; monitor before public claims)
- [x] Factor-attribution “why it changed” payload (not only boundary/wicket tags)

### 13.4 API (`apps/api`)
- [x] `GET /predictions/performance` — accuracy / Brier by format and confidence band
- [x] `GET /predictions/:matchId` — latest pre-match + live
- [x] `GET /predictions/:matchId/history` — time series of runs
- [x] `GET /predictions/:matchId/chart` — chart-ready series by over / major event
- [x] Admin JWT + AdminGuard: `GET /admin/predictions/model-versions`
- [x] Admin: `GET /admin/predictions/runs` (paginated) and `GET /admin/predictions/runs/:runId` (snapshot review)
- [x] Admin: `GET /admin/predictions/calibration` (reliability bins + latest fit)
- [x] Prediction API integration tests (`apps/api/src/predictions/predictions.spec.ts`)

### 13.5 Frontend (after API) — done
- [x] `/predictions/[match-slug]` page — `/predictions` hub + `/predictions/[id]` (keyed by matchId) + `MatchPredictionTab` embedded in match detail
- [x] Probability chart and explanation UI — `PredictionChart`, `WinProbabilityBar`, `explanationReasons` / `publicWhyChanged` panels
- [x] Public prediction-performance page — accuracy/Brier by format + confidence band on `/predictions` (sample-size gated)
- [x] Admin CMS screens for model monitoring / history review — `/admin/predictions` (runs list, run snapshot, calibration bins, model versions)
- [x] LLM natural-language explanation of stored factors (optional; must not invent probs) — `AssistantNarrativeService` (env-gated; verified payload only, never invents stats)

### 13.6 Still backend-quality (not more 8.1–8.4 columns)
- [ ] Empirically trained player / live models once enough settled outcomes exist
- [ ] Public accuracy claims only after performance sample is large enough (SRS: avoid unsupported claims)

---

## PHASE 14 — Odds Intelligence (SRS Phase 5)

> Separate data domain from editorial and predictions. Licensed/authorized feeds only. Every price needs source + timestamp. Compliance before public release.

### 14.1 Schema & ingestion
- [ ] `odds_sources` table (bookmaker / feed, license status)
- [ ] `odds_markets` table (match, market type, selections)
- [ ] `odds_snapshots` table (price, format, implied probability, timestamp)
- [ ] Licensed odds-feed worker (poll or webhook)
- [ ] Stale-price detection and alerts

### 14.2 API
- [ ] `GET /odds/:matchId` — comparison across sources for same market
- [ ] Best displayed price (no guaranteed-profit language)
- [ ] Opening vs current price and % movement
- [ ] Odds history series for charts
- [ ] Decimal / fractional / American conversion helpers
- [ ] Implied probability and bookmaker margin
- [ ] Model-vs-market comparison (joins prediction domain)
- [ ] Optional significant-movement alert hook

### 14.3 Compliance
- [ ] Age-gating / regional restriction hooks
- [ ] Responsible-use messaging payload
- [ ] Advertising restriction flags before public odds UI

### 14.4 Frontend (after API + compliance)
- [ ] `/odds/[match-slug]` page
- [ ] Movement charts and source timestamps

---

## PHASE 15 — Interactive Tools (SRS Phase 5, backend)

> Shipped as client-side formula tools under `/tools/{slug}` (`toolsCatalog.ts` marks each as `formula` or `stored` — no new backend APIs by design; "stored" tools reuse existing endpoints).

- [x] NRR / required run rate / current run rate calculator APIs — client tools `/tools/nrr`, `/tools/required-run-rate`, `/tools/current-run-rate`
- [x] DLS calculator API — `/tools/dls` (educational resource table, not licensed ICC DLS)
- [x] Batting strike rate / average; bowling economy / average APIs — `/tools/batting-strike-rate`, `/tools/batting-average`, `/tools/bowling-economy`, `/tools/bowling-average`
- [x] Follow-on calculator API — `/tools/follow-on`
- [x] Player comparison and team comparison APIs — `ToolPlayerCompare` (stored players API) + `/tools/player-compare`; team compare via `CompareBoard` (`/teams?a=&b=`, `/compare` redirect)
- [x] Head-to-head analyzer UI (backend `GET /head-to-head` already exists) — match detail widget + team `h2h` tab + `/tools/head-to-head`
- [x] Match / what-if simulator — `/tools/match-simulator`, `/tools/what-if` (client formulas, labeled "not a live model")
- [~] Odds converter + implied probability calculator APIs — `ToolOdds` component built (`odds`/`implied` kinds handled in `ToolCalculator`) but not exposed in the tools catalog pending Phase 14 compliance
- [x] Fantasy points / informational XI tool — `/tools/fantasy-xi` (informational only)
- [x] Frontend `/tools/{tool-slug}` pages — `/tools` hub + `/tools/[slug]` with metadata

---

## PHASE 16 — Cricket AI Assistant (SRS §11)

> Retrieve-then-explain: intent → verified DB reads → optional LLM narrative. No stats from model memory.

### 16.1 Shared contract
- [x] `AssistantIntent`, `AssistantAnswer`, `sources`, `unavailable` in `@cricapp/shared-types`

### 16.2 API (`apps/api`)
- [x] `POST /assistant/ask` — rule-based intent + slots
- [x] `team_head_to_head` handler (HeadToHeadService + tally summary)
- [x] `match_prediction_summary` handler (latest pre-match or live run)
- [x] `live_win_prob_explain` handler (diff last two runs + explanation reasons)
- [x] Optional LLM narrative when `ASSISTANT_LLM_ENABLED=true` and `OPENAI_API_KEY` set
- [x] Integration tests (`apps/api/src/assistant/assistant.spec.ts`)
- [x] `player_compare` handler (PSL leader stats for a season, shared stat categories only)
- [x] `standings_qualification` handler (PSL standings + fixtures, top-4 playoff math)
- [x] `player_recent_form` handler (`match_summary` player lines, timeline fallback)
- [x] Entity linking for ambiguous team/player names — `assistant-team-resolve` / `assistant-player-resolve` utils (alias variants, Sportradar "Last, First" matching, candidate scoring; spec-tested)
- [x] Session history / rate-limit tuning for production chat UI — per-tab `sessionId` on every ask, in-panel conversation history + follow-up prompts, `@Throttle` 20 req/min on `POST /assistant/ask`

### 16.3 Frontend
- [x] Chat panel on match / player / PSL pages with source chips linking to entities — global `AssistantLauncher` (ClientLayout) with location-aware context (match, player, team, PSL, predictions); `SourceChips` deep-link to `/matches`, `/players`, `/predictions`, `/psl`
- [x] Display `unavailable` when data is missing (never hide gaps) — `UnavailableBanner` + honest gap messaging in answers

---

## Progress Summary (update as phases complete)

| Phase | Layer | Status |
|-------|-------|--------|
| 1. Architecture & Foundation | Infra | ~95% (CD pipeline + staging env pending) |
| 2. Backend Core Infra | Backend | ~99% (cookie sessions, superadmin, logout) |
| 3. Ingestion Service | Ingestion | ~92% (live Redis prune on completed matches; **live poll still blocked on Sportradar 429 / new key**) |
| 4. Backend API Endpoints | Backend | ~99% (categories, slugs, stream comments, analytics, Cloudinary, live-match fix; E2E FCM send pending live creds) |
| 5. Frontend Pages & Components | Frontend | ~100% (all pages, boards, shared components, admin CMS done) |
| 6. Real Data Integration | Frontend+Backend | ~100% (all listed surfaces on real APIs) |
| 7. News / Editorial | Full-stack | ~100% (backend + frontend wiring, Urdu routes, author pages, QA done) |
| 8. Live Streams Module | Full-stack | ~90% (backend, frontend, comments done; licensed provider + legal/licensing check pending) |
| 9. User System & Engagement | Full-stack | ~95% (auth UI, favorites, comments, sharing done; real FCM web token pending Firebase SDK) |
| 10. Technical Debt | Cross-cutting | ~100% (all listed items done) |
| 11. Testing & QA | Cross-cutting | ~70% (backend/ingestion/prediction suites done; frontend component tests, E2E, load testing, SRS QA pass pending) |
| 12. Deployment & Launch | DevOps | ~40% |
| 13. AI Prediction Centre | Backend+ML | **~95% — backend + frontend done (hub, match pages, charts, admin monitoring); trained models + public accuracy claims await settled sample** |
| 14. Odds Intelligence | Backend | **0% — not started** |
| 15. Interactive Tools | Backend+Frontend | **~90%** (all tools shipped as client-side `/tools/{slug}` calculators; odds converter built but unlisted pending Phase 14) |
| 16. Cricket AI Assistant | Backend+Frontend | **~95%** (all intents, entity linking, throttling, global chat panel with source chips + unavailable states) |

**Overall (updated Sep 23, 2026): sports + CMS stack is production-shaped for sessions, editorial, admin dashboards, newsletter/gallery. Prediction centre is complete end-to-end (worker, APIs, public UI, admin monitoring). Tools and AI assistant are live in the frontend. Next large backend domain: Odds Intelligence (Phase 14), plus deployment/QA tracks (Phases 11–12) and a working Sportradar key for live polling.**

---

*This roadmap should be updated every time a task is completed or a new task is identified. Keep checkboxes accurate — they are the primary progress signal for both humans and AI agents working on this project.*
