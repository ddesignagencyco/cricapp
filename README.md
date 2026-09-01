# cricapp

Live cricket app monorepo: Next.js web, NestJS API, and a separate ingestion service.

## Layout

```
cricapp/
├── apps/web                 # Next.js frontend
├── apps/api                 # NestJS backend
├── services/ingestion       # Independently deployable ingestion
├── packages/shared-types    # CanonicalMatch + MATCH_STATUS / EVENT_TYPES
├── .github/workflows        # CI: lint + test on PR
└── docs/architecture.md
```

## Setup

```bash
npm install
cp .env.example .env
```

Copy each app’s `.env.example` if you run that app locally. Never commit `.env` files.

| Variable | Used by |
| --- | --- |
| `SPORTRADAR_API_KEY` | ingestion |
| `REDIS_URL` | ingestion, api |
| `DATABASE_URL` | ingestion, api |
| `NEXT_PUBLIC_API_URL` | web |

## Scripts

```bash
npm test    # workspace tests (starts with ingestion normalize/diff)
npm run lint
```

## Branching and PRs

- `main` is always deployable. No direct pushes; PR required, squash-merge.
- Feature branches: `feat/live-match-page`, `fix/redis-reconnect`. Keep them short-lived.
- Skip `develop` / `staging` until you need a QA environment.
- Every change goes through a PR (including self-review). Use the template: what changed, how to test, link to the issue.

## Deploy

Secrets live in the host, not in the repo.

- **web** — Vercel (`apps/web`)
- **api** / **ingestion** — Railway or Render, separate services

CI runs on every PR. Wire auto-deploy on merge to `main` when you are ready.

## Work tracking

GitHub Issues + Projects (Backlog / In Progress / Review / Done). One issue per Sprint task.
