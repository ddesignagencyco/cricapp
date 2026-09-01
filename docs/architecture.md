# Architecture

Ingestion and the HTTP API are **independently deployable**. That is why `services/ingestion` lives next to `apps/api`, not inside it.

## Layout

| Path | Role |
| --- | --- |
| `apps/web` | Next.js frontend (Vercel) |
| `apps/api` | NestJS API (Railway / Render) |
| `services/ingestion` | Provider polling, normalize, diff, persist / publish |
| `packages/shared-types` | `CanonicalMatch`, events, Redis keys / TTLs |

```
Sportradar  →  ingestion  →  Postgres + Redis  →  API  →  web
```

Ingestion owns provider-shaped payloads. It writes **canonical** match state (`CanonicalMatch` in `packages/shared-types/src/schema.js`) and emits `MatchEvent`s (`match_started`, `status_change`, `runs`, `wicket`, `milestone`). The API never talks to Sportradar. The web app never talks to Redis or the provider.

## Decisions

- **Monorepo** at two people: one PR can change a type and both consumers; no extra repos for shared config.
- **No `develop` / `staging` branch** until a dedicated QA environment exists. `main` is always deployable.
- **Secrets stay out of git.** Commit `.env.example` (names only). Set real values per environment in the host.
- **CI on every PR:** install, lint, test. Auto-deploy on merge to `main` comes later (Vercel for web; Railway/Render for api and ingestion).

## Branching

- `main` — protected, PR required, squash-merge
- `feat/…`, `fix/…` — short-lived; merge within a few days

## Tracking

GitHub Issues + a Projects board (Backlog / In Progress / Review / Done). One issue per Sprint task so work is not duplicated.
