# 🏏 CricApp

**Pakistan's first cricket app** for live scores, news, feeds and everything Pakistan Super League (PSL). One place to follow the action — ball-by-ball live updates, fixtures, standings, squads, player & team profiles, head-to-head records and more.

---

## 🎯 What is CricApp?

CricApp is a cricket fan's companion, built for Pakistan cricket fans first:

- 🏏 **Live cricket** — real-time scores and match state for every live match
- 📡 **Ball-by-ball updates** — live timelines streamed as they happen
- 🏆 **Pakistan Super League hub** — comprehensive PSL coverage including points tables, fixtures, squads, and statistical leaders
- 📰 **Cricket news & feed** — a single feed of the latest cricket action, headlines and updates
- 👥 **Teams & players** — profiles, rosters, and searchable player data for international and franchise cricket
- ⚔️ **Head-to-head** — previous and upcoming meetings between any two teams
- 🔔 **Real-time streaming** — instant push notifications and updates over a live event stream

---

## ✅ Features

| Feature | What you get |
| --- | --- |
| 🏏 Live match centre | Full score state, current batting/bowling, run rate, status for all live matches |
| 📡 Live feeds | Server-sent, push-based score and ball-by-ball updates — no refresh required |
| 🏆 PSL section | Standings, fixtures, top performers (batting/bowling leaders) and full squads for every PSL season |
| 👥 Team profiles | Roster, schedule, and results for international and franchise sides |
| ⭐ Player profiles | Detailed player cards with role, nationality, style of play and team |
| ⚔️ Head-to-head records | Historical and upcoming meetings between any pair of teams |
| 🗓️ Global schedule | Daily schedule & results for every cricket-playing nation and competition |
| 🔍 Search | Find teams and players fast |

---

## 🗂️ Repository layout

```
cricapp/
├── apps/
│   ├── web/                # Frontend (web app — teams, players, live, PSL)
│   └── api/                # Backend API — serves data + live event streams
├── services/
│   └── ingestion/          # Keeps every dataset fresh in the background
├── packages/
│   └── shared-types/       # Shared types & PSL configuration
├── .github/workflows/      # CI: lint + test on every PR
└── docs/architecture.md    # Architecture deep-dive
```

---

## 🧱 How data flows

```
 Data provider
      │  (background sync: live matches + daily datasets + PSL)
      ▼
 services/ingestion ──normalize──▶ canonical state ──diff──▶ only changes
      │                                        │
      │ writes                                  │ publishes to Redis (pub/sub)
      ▼                                        ▼
   PostgreSQL  ◀────────────────────────   Redis (cache + live-stream bus)
      ▲
      │ reads
      ▼
 Backend API  ──REST + SSE──▶  Web app / live feeds
```

Data is always fresh: the ingestion service continuously polls live matches, keeps PSL datasets in sync, and streams updates to subscribers the moment anything changes.

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

### 3. Configure environment

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp services/ingestion/.env.example services/ingestion/.env
```

Fill in the required keys in `services/ingestion/.env` and `apps/api/.env` before starting.

> 🚨 Never commit `.env` files (they're git-ignored). Real secrets live in the deployment environment.

### 4. Prepare the database

```bash
cd apps/api
npx prisma migrate deploy
npx prisma generate
cd ../..
```

### 5. Start the ingestion service (needed for data)

```bash
cd services/ingestion
node --env-file-if-exists=.env src/index.js
```

On startup it syncs PSL data, live matches and reference datasets, then keeps polling for live matches. Leave this terminal running while you develop.

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

## ⚙️ Configuration

| Variable | Description |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection string |
| `API_PORT` | API port (default `3001`) |
| `NEXT_PUBLIC_API_URL` | Browser-facing API base URL |

Advanced tuning — poll frequencies, sync intervals, and per-cycle limits — lives in `services/ingestion/.env` (see `.env.example`). The reference sync auto-derives its targets from already-ingested data, so no manual identifiers need configuring.

---

## 🧪 Development scripts

```bash
npm test          # workspace tests
npm run lint      # lint across workspaces
```

---

## 🌿 Branching & PR workflow

- `main` is always deployable — **no direct pushes**, PR + squash-merge only.
- Feature branches are short-lived and descriptive: `feat/live-match-page`, `fix/redis-reconnect`.
- Every change goes through a PR using the template: *what changed, how to test, link to the issue*.

---

## 🚀 Deployment

- **web** → Vercel (`apps/web`)
- **api** → Railway or Render
- **ingestion** → Railway or Render (separate service)

CI runs on every PR. Secrets live on the host, never in the repo.

---

## 🧊 Troubleshooting

| Symptom | Likely cause & fix |
| --- | --- |
| Empty responses everywhere | Ingestion isn't running — start it (step 5). |
| `ECONNREFUSED` on ingestion start | Postgres/Redis down — `docker compose up -d` and re-check `docker ps`. |
| Data provider rejects requests | Rate-limited — a dedicated consumer key per service avoids sharing a quota. |