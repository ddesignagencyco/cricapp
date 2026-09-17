# 🏏 CricApp

**Pakistan's first cricket app** for live scores, news, feeds and everything Pakistan Super League (PSL). One place to follow the action — ball-by-ball live updates, fixtures, standings, squads, player & team profiles, head-to-head records and more.

---

## 🎯 What is CricApp?

CricApp is a cricket fan's companion, built for Pakistan cricket fans first:

- 🏏 **Live cricket** — real-time scores and match state for every live match
- 📡 **Ball-by-ball updates** — live timelines streamed over Socket.IO as they happen
- 🏆 **Pakistan Super League hub** — points tables, fixtures, squads, and statistical leaders
- 📰 **News, editorial & gallery** — headlines, authors, editorial pages, and photo galleries
- 👥 **Teams, players, tours & tournaments** — profiles, rosters, schedules, and searchable player data
- ⚔️ **Head-to-head** — previous and upcoming meetings between any two teams
- 🔮 **Predictions (API)** — statistical pre-match and live win probabilities (web UI not shipped yet)
- 👤 **Accounts** — register / login, favorites, comments, newsletter, contact, and push-notification prefs
- 🛠️ **Admin CMS** — JWT-guarded tools for news, users, streams, gallery, newsletter, and more

---

## ✅ Features

| Feature | What you get |
| --- | --- |
| 🏏 Live match centre | Full score state, current batting/bowling, run rate, status for all live matches |
| 📡 Live feeds | Socket.IO (`/matches` namespace) + Redis pub/sub — no page refresh required |
| 🏆 PSL section | Standings, fixtures, top performers and squads for every PSL season |
| 🗓️ Schedule & results | Daily schedule and results across competitions |
| 👥 Teams & players | Roster, schedule, results, and detailed player cards |
| ⚔️ Head 2 head | Historical and upcoming meetings between any pair of teams |
| 🏆 Tours & tournaments | Catalogue pages for tours and tournament seasons |
| 📰 News & editorial | Articles (incl. translations), authors, categories, editorial pages |
| 🖼️ Gallery | Photo galleries with admin upload/preview |
| 📺 Streams | Watch/stream listings managed from admin |
| ⭐ Favorites & comments | Follow entities and discuss articles/matches when signed in |
| 📧 Newsletter & contact | Subscribe/unsubscribe plus contact form submissions |
| 🔔 Notifications | In-app history and optional FCM push |
| 🔍 Search & compare | Find teams/players and compare sides |
| 🔮 Predictions | Public + admin REST APIs; worker writes append-only runs |
| 🛠️ Admin | News, matches, teams, players, users, gallery, comments, settings, ads |

---

## 🗂️ Repository layout

```
cricapp/
├── apps/
│   ├── web/                # Next.js frontend (Vercel)
│   └── api/                # NestJS API — REST, Swagger, Socket.IO
├── services/
│   ├── ingestion/          # Sportradar polling → Postgres + Redis
│   └── prediction/         # Pre-match + live statistical models
├── packages/
│   └── shared-types/       # Canonical match types, Redis keys, prediction constants
├── docker-compose.yml      # Local Postgres + Redis (+ optional workers profile)
├── docker-compose.prod.yml # Full stack including api, ingestion, prediction
├── .github/workflows/      # CI: lint + test on PRs to main and dev
└── docs/                   # Architecture, SRS, roadmap
```

Workspaces: `apps/*`, `packages/*`, `services/*` (`Node.js ≥ 20`).

---

## 🧱 How data flows

```
 Sportradar
      │
      ▼
 services/ingestion ──normalize──▶ canonical state ──diff──▶ only changes
      │                                        │
      │ writes                                  │ publishes to Redis
      ▼                                        ▼
   PostgreSQL  ◀────────────────────────   Redis (cache + live bus)
      ▲                                        │
      │ reads                                  │ live keys / events
      ▼                                        ▼
 services/prediction ──append-only──▶ prediction_* tables
      ▲
      │ reads
      ▼
 Backend API  ──REST + Socket.IO──▶  Web app
```

- **Ingestion** is the only service that talks to Sportradar. It keeps live matches, PSL, news sync, and reference datasets fresh.
- **Prediction** never calls a provider probability API. It scores from Postgres (+ Redis live state) and stores every run with model version, feature snapshot, and result.
- **API** never talks to Sportradar. **Web** never talks to Redis or the provider.

---

## 🚀 Getting started (for developers)

### Prerequisites

- [Node.js](https://nodejs.org) **≥ 20**
- [Docker](https://www.docker.com/) (for Postgres + Redis)

### 1. Install dependencies

```bash
npm install
```

### 2. Start Postgres + Redis

```bash
docker compose up -d      # starts Postgres + Redis
docker ps                 # confirm both containers are "Up"
```

Optional prediction worker container:

```bash
docker compose --profile workers up -d
```

### 3. Configure environment

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp services/ingestion/.env.example services/ingestion/.env
cp services/prediction/.env.example services/prediction/.env
```

Fill in `SPORTRADAR_API_KEY` for ingestion, `JWT_SECRET` (and optional mail/Cloudinary/Firebase) for the API. Prediction can reuse the same `DATABASE_URL` / `REDIS_URL` as the API.

> 🚨 Never commit `.env` files (they're git-ignored). Real secrets live in the deployment environment.

### 4. Prepare the database

```bash
cd apps/api
npx prisma migrate deploy
npx prisma generate
cd ../..
```

On Windows, stop Nest (`npm run start:dev`) before `prisma generate` if you hit `EPERM` renaming `query_engine-windows.dll.node`.

Optional owner user: set `SUPERADMIN_*` in `apps/api/.env` and run `npm run prisma:seed` from `apps/api`.

### 5. Start ingestion (needed for live / PSL / reference data)

```bash
cd services/ingestion
npm start
```

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

### 7. Start the web app

```bash
cd apps/web
npm run dev
```

Default: [http://localhost:3000](http://localhost:3000) with `NEXT_PUBLIC_API_URL=http://localhost:3001`.

### 8. Start the prediction worker (optional)

Needed for `GET /predictions/...` to fill in. Pre-match uses existing sports rows even if Sportradar live poll fails.

```bash
cd services/prediction
npm start
```

---

## ⚙️ Configuration

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `API_PORT` | API port (default `3001`) |
| `NEXT_PUBLIC_API_URL` | Browser-facing API origin (web; no `/api` suffix in `.env.example`) |
| `JWT_SECRET` | Session/JWT signing secret |
| `SPORTRADAR_API_KEY` | Ingestion provider key |
| `CORS_ORIGINS` | Comma-separated origins, or `*` |

Ingestion tuning (poll intervals, QPS, PSL seasons) lives in `services/ingestion/.env.example`. Prediction intervals and calibration flags live in `services/prediction/.env.example`.

---

## 🔮 Predictions

Worker models: `prematch-logit-v2`, `live-resource-v2`. Storage is append-only (`prediction_runs`, `prediction_features`, `prediction_results`, `prediction_calibrations`).

Public API:

- `GET /predictions/performance`
- `GET /predictions/:matchId`
- `GET /predictions/:matchId/history`
- `GET /predictions/:matchId/chart`

Admin (JWT + admin role): model versions, paginated runs, calibration bins.

There is no `/predictions` page in `apps/web` yet.

---

## 🧪 Development scripts

```bash
npm test          # all workspaces (api, ingestion, prediction, shared-types)
npm run lint      # lint across workspaces
```

Per workspace:

```bash
npm run test --workspace @cricapp/api
npm run test --workspace @cricapp/ingestion
npm run test --workspace @cricapp/prediction
npm run test --workspace @cricapp/shared-types
```

API integration tests use an isolated `cricapp_test` database (see `TEST_DATABASE_URL`).

---

## 🌿 Branching & PR workflow

- CI runs on **`main`** and **`dev`**.
- Prefer PRs into `dev`, then promote to `main` when ready to deploy.
- Feature branches are short-lived: `feat/…`, `fix/…`.
- PR description: *what changed, how to test*.

---

## 🚀 Deployment

| Piece | Typical host |
| --- | --- |
| `apps/web` | Vercel |
| `apps/api` | Railway / Render (or `docker-compose.prod.yml`) |
| `services/ingestion` | Railway / Render (separate process) |
| `services/prediction` | Railway / Render (separate process) |

CI: install, lint, test on every PR. Secrets live on the host, never in the repo.

---

## 🧊 Troubleshooting

| Symptom | Likely cause & fix |
| --- | --- |
| Empty sports responses | Ingestion isn't running — start it (step 5). |
| `ECONNREFUSED` on worker start | Postgres/Redis down — `docker compose up -d` and re-check `docker ps`. |
| Data provider `403` / rejects requests | Bad or quota-shared Sportradar key — use a dedicated consumer key. Pre-match predictions can still run from existing DB rows. |
| Empty `/predictions/:matchId` | Prediction worker not running, or no upcoming/live match in horizon. |
| Prisma `EPERM` on generate (Windows) | Nest is locking the query engine — stop the API, generate, restart. |
| Nest TS errors for Prisma models | Stale client after a schema merge — regenerate Prisma client. |
