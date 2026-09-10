# CricApp — Project Roadmap & Task Tracker

> **Purpose:** This file is the single source of truth for project progress. It is structured in phases, each broken into **Frontend**, **Backend**, and **Ingestion** task groups. Check a box (`- [x]`) when that task is verified complete. This file is meant to be read and updated by AI coding agents as well as humans — keep task descriptions atomic and unambiguous so an agent can pick up any unchecked box and know exactly what "done" means.
>
> **Baseline source:** Progress Report dated Sep 8, 2026 (Day 8 of development).
> **Last updated:** Sep 10, 2026 — backend priorities 1–4 (search, editorial hardening, engagement, ingestion health). Live Sportradar poll paused pending a new API key.

**Legend:**
- `[x]` = Complete / verified
- `[ ]` = Not started or incomplete
- `[~]` = Partially done (see notes under the task)

---

## PHASE 1 — Architecture & Project Foundation

### 1.1 Monorepo & Structure
- [x] Set up monorepo with `apps/web`, `apps/api`, `services/ingestion`, `packages/shared-types`
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
- [x] User accounts/profiles module (DB models + `/auth` endpoints)
- [x] `PATCH /auth/me` — update displayName, avatarUrl, username

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
- [x] Event diffing (started, status_change, runs, wicket, milestone)
- [x] Redis pub/sub for real-time event publishing
- [x] PostgreSQL upserts for 13+ tables
- [x] Redis cache with TTL management
- [x] Staleness tracking per data category

### 3.4 Testing
- [x] Unit tests — normalization (`test/normalize.test.js`)
- [x] Unit tests — diffing (`test/diff.test.js`)
- [x] Unit tests — PSL normalizers (`test/psl.test.js`)
- [x] Unit tests — reference normalizers (`test/reference.test.js`)
- [x] Integration tests for full sync pipeline (`test/integration.test.js`) — mock Sportradar → `pollOnce()` → DB + Redis verified

---

## PHASE 4 — Backend API Endpoints (Data Delivery)

### 4.1 Matches Module — Backend
- [x] `GET /matches`
- [x] `GET /matches?q=` text search (teams, tournament, venue, score)
- [x] `GET /matches/live`
- [x] `GET /matches/:matchId`
- [x] `GET /matches/:matchId/timeline`
- [x] `GET /matches/live/stream` (SSE)
- [x] `GET /matches/:matchId/stream` (SSE)

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
- [x] `GET /tours`
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
- [x] Design News DB schema (articles, categories, tags, publish date, author/source)
- [x] `POST/GET/DELETE/PATCH` admin CMS endpoints for news content
- [x] `GET /news` — list endpoint with pagination/filtering
- [x] `GET /news/:newsId` — single article detail endpoint (by ID or slug)
- [x] Public list/detail hide unpublished drafts (`isPublished: true` only)
- [x] Featured / breaking flags (`isFeatured`, `isBreaking`) + query filters
- [x] Language field (`en` / `ur`) + `?language=` filter
- [x] SEO fields on articles (`metaTitle`, `metaDescription`, `canonicalUrl`)
- [x] Author model + `GET/POST /admin/authors`, `PATCH /admin/authors/:id`
- [x] Article–entity links (players, teams, matches, series) + query filters
- [x] `GET /admin/news` includes drafts for CMS
- [x] Smoke-tested: publish article then fetch by slug and list

### 4.13 Search Module — Backend
- [x] `GET /search?q=` unified search (`players`, `teams`, `matches`, `tournaments`)
- [x] Integration tests for `/search` and `/teams?q=`
- [x] Smoke-tested against running API (`q=lahore` returns Lahore Qalandars)

### 4.8 Live Streams Module — Backend
- [x] Design Streams DB schema (stream URL/provider, match link, status, scheduled time)
- [x] `GET /streams` — list active/upcoming streams
- [x] `GET /streams/:streamId` — stream detail endpoint

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

### 4.11 Comments / Reactions — Backend
- [x] DB schema for comments + reactions (linked to match/news)
- [x] `POST /comments` endpoint
- [x] `GET /comments` endpoint with pagination
- [x] `POST/GET /reactions` endpoints
- [x] Moderation/reporting — `POST /comments/:id/report`, admin queue, approve/hide/delete

### 4.12 Social Sharing — Backend
- [x] Share-link generation endpoint with OG meta support (`/share/:type/:id`)
- [x] Share analytics tracking (`share_stats` increment on share link hit; totals in `/admin/analytics`)

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
- [~] `/streams` — built but uses mock data, hidden from nav

### 5.2 Missing Frontend Pages (Backend endpoints already exist)
- [ ] `/head-to-head` or `/matches/[id]/head-to-head` — dedicated head-to-head comparison page
- [ ] `/teams/[id]/schedule` or tab — team schedule/results dedicated view
- [ ] `/schedules/[date]` — daily schedule/results dedicated page
- [ ] `/tours` — tours listing/detail page

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
- [x] `Navbar` (search, theme toggle, mobile menu)
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
- [x] `AdBanner`, `ShareButton` (UI ready; backend `/share/:type/:id` endpoint wired)

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

---

## PHASE 6 — Frontend ↔ Backend Real Data Integration

- [x] Matches (live, upcoming, completed) — connected to real API
- [x] Teams (directory, detail, roster) — connected to real API
- [x] Players (directory, detail) — connected to real API
- [x] PSL (standings, fixtures, leaders, squads) — connected to real API
- [x] Search (matches) — connected to real API
- [ ] Search (teams) — currently mock data, connect to real API
- [ ] Search (players) — currently mock data, connect to real API
- [ ] Search (tournaments) — currently mock data, connect to real API
- [ ] Tournaments page — currently mock data, connect to real API (backend endpoint already exists)
- [x] News — real backend API exists (Phase 4.7 complete)
- [x] Streams — real backend API exists (Phase 4.8 complete)

---

## PHASE 7 — News / Editorial Module (End-to-End)

### 7.1 Backend (done)
- [x] **Ingestion:** RSS/Atom sync (`newsSync.js`) — parser, normalizer, dedup, Postgres upserts, Redis invalidation
- [x] **Backend:** `/news` public + admin CMS endpoints (see Phase 4.7)
- [x] Public unpublished-draft filter
- [x] Featured / breaking / language / SEO fields
- [x] Author profiles (admin CRUD)
- [x] Article links to players, teams, matches, series
- [x] `GET /admin/ingestion-health` (Redis heartbeat, live-set, sync keys)

### 7.2 Editorial remaining — Backend
- [ ] Production `NEWS_SOURCES` env (RSS list) configured for Pakistan/PSL/international feeds
- [ ] Seed SRS category set (Breaking, Pakistan Cricket, PSL, International, Match News, Analysis, Features, Records, Interviews, Explainers)
- [ ] Native Urdu authoring workflow (store `ur` body/headline separately, not auto-translate-only)
- [ ] Public author pages API (`GET /authors`, `GET /authors/:slug` with article list)
- [ ] Editorial policy + correction policy content endpoints or static CMS pages
- [ ] Push-notification draft + social-copy fields on articles
- [ ] Google News sitemap endpoint
- [ ] Article JSON-LD / NewsArticle payload helper for frontend
- [ ] `hreflang` pairs for `en` / `ur` article variants

### 7.3 Editorial remaining — Frontend
- [ ] Wire `NewsBoard` and `NewsDetailBody` to real API instead of mock data
- [ ] Unhide `/news` route from navigation once real data flows
- [ ] Author profile pages
- [ ] Featured / breaking presentation
- [ ] Urdu (`/ur/...`) article routes
- [ ] QA: pagination, empty states, and image handling for articles

---

## PHASE 8 — Live Streams Module (End-to-End)

- [~] **Ingestion:** source live stream metadata/links — `streamsSync.js` + admin CRUD; licensed provider not wired
- [x] **Backend:** implement `/streams` endpoints (see Phase 4.8)
- [ ] **Frontend:** wire `LiveStreamsBoard` to real API instead of mock data
- [ ] **Frontend:** unhide `/streams` route from navigation once real data flows
- [ ] Legal/licensing check for stream embedding (confirm rights before going live)

---

## PHASE 9 — User System & Engagement Features

> *Only pursue this phase if confirmed as an SRS requirement.*

### 9.1 Authentication — Backend + Frontend
- [x] Backend: user auth system (signup/login/JWT)
- [x] Backend: password reset / email verification flow — `PasswordResetToken` + `EmailVerificationToken` models, `POST /auth/forgot-password`, `POST /auth/reset-password`, `POST /auth/verify-email`, `POST /auth/resend-verification`, `MailerService` with SMTP/SendGrid/Resend/console providers
- [ ] Frontend: signup/login pages
- [ ] Frontend: auth state management (Zustand store + protected routes)

### 9.2 User Accounts/Profiles — Backend + Frontend
- [x] Backend: user profile DB model + endpoints (Phase 2.1)
- [x] Backend: `PATCH /auth/me` profile update
- [ ] Frontend: profile page (view/edit)

### 9.3 Favorites/Bookmarks — Backend + Frontend
- [x] Backend: endpoints (see Phase 4.10)
- [ ] Frontend: "favorite" toggle UI on Team/Player/Match cards
- [ ] Frontend: "My Favorites" dashboard page

### 9.4 Comments/Reactions — Backend + Frontend
- [x] Backend: endpoints (see Phase 4.11)
- [ ] Frontend: comment thread UI on match/news detail pages
- [ ] Frontend: reaction buttons (like/emoji) UI

### 9.5 Social Sharing — Backend + Frontend
- [x] Backend: share-link endpoint (see Phase 4.12)
- [ ] Frontend: wire existing `ShareButton` component to backend/share APIs

### 9.6 Push Notifications — Backend + Frontend
- [x] Backend: notification system (see Phase 4.9)
- [ ] Frontend: replace hardcoded mock notification dropdown in `Navbar` with real data
- [ ] Frontend: notification permission prompt + settings UI

---

## PHASE 10 — Technical Debt & Code Quality

- [ ] Remove legacy `cricketApi.ts` service layer; consolidate on new `services/*.ts` pattern
- [ ] Fix `MatchStatus` TypeScript type to include `"cancelled"` (already present in JS schema)
- [ ] Decide fate of hidden News/Streams pages — either finish (Phase 7/8) or remove until ready
- [x] Full pagination audit across all list endpoints (see Phase 2.1)
- [x] Code review pass for consistent error handling across API modules — improved FK validation for news categories and comment reactions; auth endpoints use consistent `BadRequestException` / `UnauthorizedException` / `ConflictException`

---

## PHASE 11 — Testing & QA

- [x] Ingestion integration tests (full pipeline, see Phase 3.4)
- [x] Backend API integration/e2e tests per module — 79 tests across 12 suites including Search, Auth (`PATCH /auth/me`), News (draft hiding + admin list)
- [x] Manual API smoke: search, signup + `/auth/me`, publish news + get by slug (Sep 10, 2026)
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

> Predictions must come from statistical / ML models on structured sports data. An LLM may explain results but must not invent probabilities.

### 13.1 Schema & storage
- [ ] `prediction_runs` table (matchId, timestamp, modelVersion, stage: pre_match | live)
- [ ] `prediction_features` table (input snapshot JSON used for that run)
- [ ] `prediction_results` table (winner probs, score range, top batter/bowler, XI probs, confidence)
- [ ] Do not delete or silently overwrite incorrect historical predictions

### 13.2 Pre-match prediction service
- [ ] Feature extraction from sports DB (form, venue, H2H, squad)
- [ ] Match winner probability + confidence / calibration band
- [ ] Projected first-innings or final score range
- [ ] Top batter and top wicket-taker probabilities
- [ ] Playing XI probability from squad availability
- [ ] Pitch / venue / weather impact fields (when data exists)
- [ ] Toss-adjusted prediction after toss

### 13.3 Live prediction service
- [ ] Win probability updated during the match
- [ ] Probability history by over / major event
- [ ] Live projected score range
- [ ] Match momentum / pressure index
- [ ] Partnership projection and wicket-risk (if model quality supports)
- [ ] Measurable "why did the prediction change?" explanation payload

### 13.4 API
- [ ] `GET /predictions/:matchId` — latest pre-match + live
- [ ] `GET /predictions/:matchId/history` — time series of runs
- [ ] `GET /predictions/performance` — public accuracy by format and confidence band
- [ ] Admin: model version list + prediction-history review

### 13.5 Frontend (after API)
- [ ] `/predictions/[match-slug]` page
- [ ] Probability chart and explanation UI
- [ ] Public prediction-performance page

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

- [ ] NRR / required run rate / current run rate calculator APIs
- [ ] DLS calculator API
- [ ] Batting strike rate / average; bowling economy / average APIs
- [ ] Follow-on calculator API
- [ ] Player comparison and team comparison APIs
- [ ] Head-to-head analyzer UI (backend `GET /head-to-head` already exists)
- [ ] Match / what-if simulator
- [ ] Odds converter + implied probability calculator APIs
- [ ] Fantasy points / informational XI tool
- [ ] Frontend `/tools/{tool-slug}` pages

---

## Progress Summary (update as phases complete)

| Phase | Layer | Status |
|-------|-------|--------|
| 1. Architecture & Foundation | Infra | ~95% |
| 2. Backend Core Infra | Backend | ~98% (`PATCH /auth/me`, Redis boot fix) |
| 3. Ingestion Service | Ingestion | ~90% (code complete; **live poll blocked on Sportradar 429 / new key**) |
| 4. Backend API Endpoints | Backend | ~98% (search, news hardening, notifications, share stats, moderation) |
| 5. Frontend Pages & Components | Frontend | ~80% (core done, 4 pages missing) |
| 6. Real Data Integration | Frontend+Backend | ~80% (backend search ready; frontend still mocks teams/players/tournaments) |
| 7. News / Editorial | Full-stack | ~75% backend done; remaining = RSS prod config, Urdu depth, sitemaps, **frontend wiring** |
| 8. Live Streams Module | Full-stack | ~40% (backend + `STREAM_SOURCES` scaffold; frontend + licensing pending) |
| 9. User System & Engagement | Full-stack | ~60% (backend complete including profile PATCH, history, expand favorites; frontend pending) |
| 10. Technical Debt | Cross-cutting | ~35% |
| 11. Testing & QA | Cross-cutting | ~60% (79 API tests + smoke: search / auth / news) |
| 12. Deployment & Launch | DevOps | ~40% |
| 13. AI Prediction Centre | Backend+ML | **0% — not started** |
| 14. Odds Intelligence | Backend | **0% — not started** |
| 15. Interactive Tools | Backend+Frontend | **~5%** (H2H API exists; calculators not started) |

**Overall project completion (updated Sep 10, 2026): sports + editorial backend largely done; next backend domains are Predictions then Odds.**

---

*This roadmap should be updated every time a task is completed or a new task is identified. Keep checkboxes accurate — they are the primary progress signal for both humans and AI agents working on this project.*
