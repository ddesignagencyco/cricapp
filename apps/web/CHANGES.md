# Changelog - PAK CRICZONE (apps/web)

All notable changes to the frontend application are documented here.

---

## 2026-09-03 15:17 - Reminder: Migrate from Mock Data to Real Backend API

### Context / Plan (NO CODE CHANGES YET — waiting for user to work on matches page first)
- We are retiring the **local mock data** (`src/data/matches.js`, `teams.js`, `players.js`, etc.) and replacing it with **real data fetched from the NestJS backend APIs**.
- The backend base URL is defined in the environment variable **`NEXT_PUBLIC_API_URL`** (see `.env.example`, e.g. `http://localhost:3001`).
- Scope is **strictly limited to `apps/web`** — no modifications to any other directories.
- Migration will happen **page by page**, starting with the **Home page**, then moving on to the **matches page** (which the user will start on).
- **State management** will use **Zustand** (already in the project) — with **well-managed stores**.
- **NO localStorage persistence** should be involved — all data must come live from the backend APIs on every fetch.
- Use **custom hooks** (e.g. `useMatches`, `useTeams`, `usePlayers`) to fetch/handle the data, since the dataset is large and needs proper organization.
- Note: `cricketApi.js` in `src/services` currently mocks all fetches with local data — this layer will be reworked to hit the NestJS endpoints.

### Why
We are moving from static demo content to live, real cricket data served by the backend so the app reflects up-to-date, dynamic information.

---

## 2026-09-03 13:25 - ESLint Setup & Linting Infrastructure

### What changed
- **Replaced oxlint with ESLint** (v9 + `eslint-config-next` v16) for full linting support with Next.js App Router.
- **Created `eslint.config.mjs`** (flat config format) with rules: `eqeqeq`, `no-console`, `prefer-const`, `no-unused-vars`, `self-closing-comp`, `jsx-no-duplicate-props`, and `@next/next/no-img-element`.
- **Updated `package.json` scripts:**
  - `lint` — runs ESLint on the entire project
  - `lint:fix` — runs ESLint with auto-fix
  - `check` — runs `lint` + `build` as a combined pre-deploy gate
  - `dev` — now uses `--turbopack` for faster development builds
  - `clean` — clears `.next` cache
- **Deleted `.oxlintrc.json`** — no longer needed after migrating to ESLint.
- **Fixed pre-existing lint errors** across 4 files:
  - `about/page.jsx` — escaped unescaped HTML entities (`'` -> `&apos;`)
  - `not-found.jsx` — escaped 3 unescaped apostrophes
  - `LiveStreamsBoard.jsx` — changed `!=` to strict `!==` (eqeqeq rule)

### Why
ESLint provides deeper integration with Next.js, React hooks rules, and JSX accessibility checks compared to oxlint. The `check` script ensures no lint or build errors pass through before deployment. The updated scripts give the team a consistent, standard workflow.
