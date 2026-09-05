# 🏏 CricApp

A live cricket application built as a **monorepo** with a Next.js web frontend, a NestJS API, and a standalone ingestion service that keeps everything in sync with **[Sportradar](https://developer.sportradar.com/)**.

> **The API is read-only.** It never writes data — everything you see is populated by the ingestion service polling Sportradar and streaming into PostgreSQL + Redis. If you open Swagger and see empty responses, the ingestion service isn't running.

---

## ✨ What it does

| Capability | Details |
| --- | --- |
| 🏏 **Live matches** | Real-time match state for every live match on Sportradar |
| 📡 **Live streaming (SSE)** | Push-based match updates over Server-Sent Events |
| 🏆 **PSL section** | Standings, fixtures, statistical leaders & team squads for PSL 2024 / 2025 / 2026 |
| 👥 **Teams & players** | Team profiles, rosters and searchable player profiles |
| 💾 **Change-driven writes** | Ingestion only persists/publishes what *changed* since the last snapshot |
| 🖥️ **Swagger docs** | Auto-generated interactive API docs + a health dashboard |

---

## 🗂️ Repository layout

```
cricapp/
├── apps/
│   ├── web/                # Next.js frontend (Vercel)
│   └── api/                # NestJS backend — REST + SSE, read-only (Railway / Render)
├── services/
│   └── ingestion/          # Polls Sportradar, normalizes → diffs → persists (Railway / Render)
├── packages/
│   └── shared-types/       # CanonicalMatch, MATCH_STATUS, EVENT_TYPES, PSL config
├── .github/workflows/      # CI: lint + test on every PR
└── docs/architecture.md    # Architecture deep-dive
```

---

## 🧱 How data flows

```
Sportradar API
      │  (poll every 30s + PSL sync on startup)
      ▼
 services/ingestion ──normalize──▶ canonical state ──diff──▶ only changes
      │                                        │
      │ writes                                  │ publishes to Redis (pub/sub)
      ▼                                        ▼
   PostgreSQL  ◀────────────────────────   Redis (cache + live-stream bus)
      ▲
      │ Prisma (reads)
      ▼
   NestJS API  ──REST + SSE──▶  Web / Swagger
```

**Ingestion** normalizes provider data to a canonical match shape, diffs it against the last snapshot, then persists rows to Postgres and publishes events to Redis. The **API** serves those rows via Prisma and streams live updates via Redis pub/sub for SSE clients.

---

## 🚀 Getting started (new developer)

### 0. Prerequisites

- [Node.js](https://nodejs.org) **≥ 20**
- [Docker](https://www.docker.com/) (for Postgres + Redis)
- A valid **Sportradar API key** (see [Configuration](#configuration))

### 1. Install dependencies

```bash
npm install
```

### 2. Start the infrastructure

```bash
docker compose up -d      # starts Postgres + Redis
docker ps                 # confirm cricapp-postgres & cricapp-redis are "Up"
```

### 3. Configure environment variables

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp services/ingestion/.env.example services/ingestion/.env
```

Then **add your Sportradar API key** to `services/ingestion/.env`:

```bash
# services/ingestion/.env
SPORTRADAR_API_KEY=your_key_here
```

> 🚨 Never commit `.env` files (they're git-ignored). Real secrets live in the host / deployment environment.

### 4. Run Prisma migrations & generate the client

```bash
cd apps/api
npx prisma migrate deploy
npx prisma generate
cd ../..
```

### 5. Start the ingestion service (**critical**)

This is the step most people miss — without it **every endpoint returns `[]`**.

```bash
cd services/ingestion
node --env-file-if-exists=.env src/index.js
```

On startup it:
1. **Syncs PSL data** — standings, fixtures, leaders and squads for 2024 / 2025 / 2026.
2. **Polls live matches** every 30 seconds, writing updates to Postgres + Redis.

Leave this terminal running while you develop.

### 6. Start the API

In a **new terminal**:

```bash
cd apps/api
npm run start:dev
```

You should see:

```
@cricapp/api listening on http://localhost:3001/api
Swagger UI: http://localhost:3001/docs
```

---

## 🔌 API reference

Interactive docs: **http://localhost:3001/docs** (Swagger). Health dashboard: **http://localhost:3001/api**.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api` | **Health** — API / Postgres / Redis status page |
| `GET` | `/api/matches` | List matches (filter by `status` / `tournament`, paginated) |
| `GET` | `/api/matches/live` | Current live matches (Redis first, Postgres fallback) |
| `GET` | `/api/matches/:matchId` | Single match by Sportradar id (e.g. `sr:match:66650320`) |
| `GET` | `/api/matches/:matchId/timeline` | Ball-by-ball match timeline (raw provider payload) |
| `GET` | `/api/teams` | All teams |
| `GET` | `/api/teams/:idOrAbbr` | Team profile (by id or abbreviation, e.g. `ENG`) |
| `GET` | `/api/teams/:idOrAbbr/players` | Team roster |
| `GET` | `/api/teams/:idOrAbbr/schedule` | Upcoming matches for a team |
| `GET` | `/api/teams/:idOrAbbr/results` | Completed matches for a team |
| `GET` | `/api/players` | Search players (`?q=name&team=ENG`) |
| `GET` | `/api/players/:playerId` | Player profile (optionally `?recent=N`, max 20) |
| `GET` | `/api/psl/seasons` | Available PSL seasons |
| `GET` | `/api/psl/standings` | PSL points table (`?season=2026` or season id) |
| `GET` | `/api/psl/schedule` | PSL fixtures |
| `GET` | `/api/psl/leaders` | PSL statistical leaders |
| `GET` | `/api/psl/squads` | PSL team squads |
| `GET` | `/api/tours` | All cricket tours |
| `GET` | `/api/tournaments` | All tournaments / competitions |
| `GET` | `/api/tournaments/:tournamentId` | Tournament record (incl. current season) |
| `GET` | `/api/tournaments/:tournamentId/seasons` | Seasons for a tournament |
| `GET` | `/api/tournaments/:id/results` | Results for a tournament or season id |
| `GET` | `/api/schedules/:date` | Daily schedule (`YYYY-MM-DD`) |
| `GET` | `/api/schedules/:date/results` | Daily results (`YYYY-MM-DD`) |
| `GET` | `/api/head-to-head/:teamA/:teamB` | Previous & upcoming meetings between two teams |
| `SSE` | `/api/matches/live/stream` | Stream **all** live match updates (Server-Sent Events) |
| `SSE` | `/api/matches/:matchId/stream` | Stream updates for a **single** match |

---

## ⚙️ Configuration

| Variable | Used by | Description |
| --- | --- | --- |
| `SPORTRADAR_API_KEY` | ingestion | Your Sportradar API key (**required**) |
| `SPORTRADAR_API_BASE_URL` | ingestion | Default: `https://api.sportradar.com` |
| `DATABASE_URL` | ingestion, api | PostgreSQL connection string |
| `REDIS_URL` | ingestion, api | Redis connection string |
| `API_PORT` | api | API port (default `3001`) |
| `NEXT_PUBLIC_API_URL` | web | Browser-facing API base URL |

### Ingestion-specific (optional)

| Variable | Description |
| --- | --- |
| `POLL_INTERVAL_MS` | Live-match poll frequency (default `30000`) |
| `PSL_SEASONS` | Restrict PSL sync, comma-separated years/ids (default: all) |
| `PSL_SYNC_INTERVAL_MS` | Optional periodic PSL re-sync (e.g. `3600000` = hourly) |
| `REFERENCE_SYNC_INTERVAL_MS` | Reference sync period (default `3600000`; `0` disables). Targets are auto-derived from ingested data (tournaments' current seasons, match records without timelines, existing head-to-head pairs) so no ids need configuring |
| `REF_SYNC_DELAY_MS` | Inter-request delay for reference sync (default `500`) |
| `REF_SYNC_MATCH_LIMIT` | Max matches auto-synced for timelines/lineups per cycle (default `20`) |
| `REF_SYNC_SEASON_LIMIT` | Max tournament results/seasons auto-synced per cycle (default `10`) |
| `REF_SYNC_TEAMS_LIMIT` | Max teams auto-synced for profiles/schedules per cycle (default `10`) |
| `REF_SYNC_TEAM_IDS` | Extra team ids for team profile / schedule / results sync (optional) |
| `REF_SYNC_PLAYER_IDS` | Extra player ids for player profile sync (optional) |
| `REF_SYNC_MATCH_IDS` | Extra match ids for timeline sync (optional) |
| `REF_SYNC_TOURNAMENT_IDS` | Extra tournament ids for season sync (optional) |
| `REF_SYNC_PAIR_IDS` | Extra team pairs for head-to-head sync (`a::b;a2::b2`) |

---

## 🧪 Scripts

```bash
npm test          # workspace tests (ingestion normalize / diff, etc.)
npm run lint      # lint across workspaces
# per-workspace, e.g.:
npm run test --workspace=@cricapp/api
npm run lint --workspace=@cricapp/ingestion
```

---

## 🌿 Branching & PR workflow

- `main` is always deployable — **no direct pushes**, PR + squash-merge only.
- Feature branches are short-lived and descriptive: `feat/live-match-page`, `fix/redis-reconnect`.
- No `develop` / `staging` until you need a QA environment.
- Every change goes through a PR (including self-review) using the template: *what changed, how to test, link to the issue*.

## 🚀 Deployment

Secrets live on the host, **never** in the repo.

- **web** → Vercel (`apps/web`)
- **api** → Railway or Render
- **ingestion** → Railway or Render (separate service)

CI runs on every PR. Wire auto-deploy on merge to `main` when you're ready.

## 📋 Work tracking

GitHub **Issues + Projects** (Backlog / In Progress / Review / Done). One issue per Sprint task.

---

## 🧊 Troubleshooting

| Symptom | Likely cause & fix |
| --- | --- |
| Swagger returns `[]` everywhere | Ingestion isn't running — start it (step 5). |
| `ECONNREFUSED` on ingestion start | Postgres/Redis down — `docker compose up -d` and re-check `docker ps`. |
| Sportradar `HTTP 403` | API key lacks **cricket** entitlement — activate it in the Sportradar developer portal. |
| Sportradar `HTTP 429` | Rate-limited — don't share one key between the ingestion service and other consumers; use a dedicated key per consumer. |
| `open Dockerfile: no such file` | Running via Docker but no Dockerfiles exist — use the local `node` steps above instead. |
