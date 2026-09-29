# Frontend Testing — `apps/web`

Status as of 2026-09-29. Covers the Jest setup, what is tested, what is not, and
how to run it.

## How to run

```bash
cd apps/web
npm test              # jest, all suites
npx jest --coverage   # with the coverage report
npm run check         # lint + typecheck + test + build
```

Gate: `npm run check` fails on a type error, a lint error, a failing test, or a
coverage **regression**. The thresholds in `jest.config.cjs` are a ratchet — they
are set just below the real number so coverage can only go up. Raise them in the
same commit that adds the tests that earned it.

## Current numbers

| | |
|---|---|
| Test files / suites | 37 |
| Tests | 1074 (all passing) |
| Statements | 28.2% |
| Branches | 21.4% |
| Functions | 26.2% |
| Lines | 28.4% |

`typecheck` clean, `lint` 0 errors. The 114 lint warnings that remain are all in
`.next-diag/dev/types/*` build artifacts and `src/services/tournaments.ts`, none
in test code.

### Coverage by area

| Area | Files | Fully untested | Statements untested |
|---|---|---|---|
| `lib/` | 20 | 0 | 0% |
| `utils/` | 10 | 0 | 0% |
| `queries/` | 5 | 0 | 0% |
| `hooks/` | 4 | 0 | 0% |
| `services/` | 29 | 1 | 8% |
| `components/` | 148 | 128 | 83% |
| `app/` | 134 | 79 | 93% |

**The logic layer is finished.** Every `lib`, `utils`, `queries` and `hooks` file
has tests, averaging 85–92% per file. The single `services/` gap is
`services/schedules.ts`, which *is* covered — its test uses
`jest.isolateModules` + `require`, so a static-import scanner does not see it.

Everything still missing is `.tsx`: 207 components and pages.

## Two config bugs that were fixed

Both made the coverage number a lie, so record them before anyone trusts a
regression from these numbers.

1. **`collectCoverageFrom` excluded every `.tsx`.** The glob was
   `'**/*.(t|j)s'`, which matches `.ts` and `.js` but not `.tsx`. Coverage was
   measured against 79 of 364 files. Corrected to `'**/*.(t|j)s?(x)'`. The
   reported coverage dropped from a fake 30.9% to a real 11.1%.

2. **No coverage thresholds at all.** `npm run check` could not fail on a
   regression. Added a `coverageThreshold.global` ratchet.

## The shared harness

`src/test/harness.tsx`, `src/test/nextMocks.tsx`, `src/test/styleStub.js` and
`src/test/setup.ts`. A new component test should not re-declare any of this.

- `renderWithProviders(ui)` — wraps in a `QueryClientProvider`
- `createTestQueryClient()` — `retry: false`, `staleTime: Infinity`
- `next/navigation`, `next/image`, `next/link` are mocked globally in `setup.ts`
- stylesheets map to `styleStub.js` (Jest has no CSS pipeline)

`setup.ts` also polyfills four things jsdom does not implement but every real
browser does. Without them whole components are untestable:

| Polyfill | Needed by |
|---|---|
| `TextEncoder` / `TextDecoder` | `lib/machineTranslate.ts` (utf-8 byte length) |
| `crypto.randomUUID` | `lib/assistant.ts` (session id) |
| `offsetWidth` / `offsetHeight` | `hooks/useFocusTrap.ts` (visibility filter rejects every node) |
| `Element.prototype.scrollIntoView` | `components/CommentsSection.tsx` (deep-link highlight) |

## What the tests caught

Real defects, not just coverage numbers.

- **`AuthForm` open-redirect** — `safeReturnTo` now has a test for
  `//evil.test`, which browsers treat as an absolute URL. Following it blindly
  would have been an open redirect.
- **`AuthForm` 403 vs 401** — the resend-verification form must appear only on
  403 (unverified email), never on 401. Getting this backwards tells a user to
  re-verify a password they simply mistyped.
- **`machineTranslate` chunking** — the provider rejects queries over 450 bytes;
  a test asserts every chunk stays under it.
- **`sanitizeHtml`** — `javascript:` and `data:` URLs are dropped, `data:image/svg`
  is rejected (SVG can carry script), attribute quotes are escaped.
- **`useMatchStream` overs rewind** — the socket sends whole overs (7) after a
  richer cricket decimal (7.3). Without the merge the over counter visibly
  rewinds. Covered.
- **`streamEmbed`** — a non-https URL is refused so it cannot be upgraded into an
  iframe `src`.

### Known issues, deliberately left in place

- `errorMessage()` in `AuthForm.tsx:58` only surfaces `.message` for `ApiError`.
  A plain `Error` becomes a generic "check your connection". Harmless today
  (the API throws `ApiError`) but a timeout would read as a wrong password.
- `shouldHideDummyAds` in `lib/advertisements/placements.ts:146` matches
  `startsWith('/admin')` with no trailing slash, unlike the anchored
  `/editorial/` and auth prefixes. No route is affected today.

## The match facts module

`src/lib/matchFacts.ts` (47 tests) derives toss, winner, result and the period
split from the match payload. Wired into the Info tab of
`components/boards/MatchDetailBody.tsx`.

**It is currently inert for toss.** `tossWonBy` arrives as a competitor id
(`sr:competitor:107203`) but the API's `teams` object carries only
`code`/`name`/`score`/`overs` — no `id`. There is nothing to match the id
against, so `resolveSideById` returns `null` and the toss row is omitted rather
than showing a raw provider id. The fix belongs in the API
(`competitorSidesFromPayload` reading `qualifier` off the stored
`sport_event.competitors`); it was written, verified against a live match, and
then reverted on request because the work was scoped to `apps/web` only.

The module deliberately **never derives a margin**. Runs-vs-wickets depends on
which side batted first, and two final totals cannot say that: `180/4` vs
`150/9` is a valid 30-run win and a valid 1-wicket win. `describeMatchResult` in
`lib/matchScoreboard.ts` makes the same call for the same reason.

## The tool share format

`src/lib/toolShare.ts` (22 tests), wired through
`components/tools/ResultShareButton.tsx` and `ResultBox`.

The old button copied `window.location.href`, so sharing a tool opened from the
menu sent a blank calculator — the recipient got the form, not the answer. Now:

```
🏏 DLS calculator
Revised target: 145

Format: ODI · Team 1 score: 160 · Team 1 overs faced: 20
👉 https://pakcriczone.com/tools/dls?format=odi&team_1_score=160&…
```

- The answer is the first line, so a chat preview shows the number.
- Inputs travel in the query string, so the recipient's copy of the page reopens
  filled in rather than blank.
- Labels matching `password|token|secret|api_key|authorization` are never shared.

Only the DLS tool passes `inputs` so far. The other 16 tools share the result
only. `ResultBox` accepts an optional `inputs` prop — adding one is a single line
per tool.

## What is left, in priority order

Roughly 207 `.tsx` files, ~8,200 statements. Ranked by where bugs actually live.

**Tier 1 — logic-bearing components.** Data transforms, filtering, pagination,
empty and error states. This is where behavioural bugs are.

| File | Size |
|---|---|
| `components/boards/MatchDetailBody.tsx` | 28 KB |
| `components/predictions/MatchPredictionsView.tsx` | 28 KB |
| `app/favorites/page.tsx` | 32 KB |
| `app/tournaments/[id]/TournamentDetailPageClient.tsx` | 23 KB |
| `components/Navbar.tsx` | 21 KB |
| `components/admin/AdminShared.tsx` | 21 KB |
| `components/boards/CompareBoard.tsx` | 18 KB |
| `components/admin/CategoryManager.tsx` | 18 KB |
| `components/boards/ScheduleBoard.tsx` | 17 KB |
| `components/MatchTimeline.tsx` | 16 KB |
| `components/boards/NewsBoard.tsx` | 15 KB |
| `components/admin/NewsEditor.tsx` | 33 KB |
| `components/odds/OddsHistoryChart.tsx`, `components/predictions/PredictionChart.tsx` | — |

**Tier 2 — Lighthouse-critical.** These decide the performance score and are
already partly covered: `RemoteImage`, `robots.ts`, `manifest.ts`, `sitemap.ts`,
`lib/advertisements/placements.ts`, `lib/newsConstraints.ts` are done. Remaining:
`app/layout.tsx`, `components/AdSlot.tsx`, `components/Footer.tsx`.

**Tier 3 — presentational.** ~170 files: `skeletons/`, most of `admin/loading.tsx`,
`EmptyState`, `Badge`, `StatCard`, `TeamLogo` and similar. Low return. The 51
route `loading.tsx` files are already swept by `tests/loadingSkeletons.test.tsx`
(tree-walk, 52 assertions) because they are all the same shape.

## Traps when writing more tests here

Each of these cost real debugging time. They are not obvious.

- **`clearAllMocks` does not clear implementations.** A `mockResolvedValue` from
  an earlier test keeps answering, and tests fail for no visible reason. Use
  `resetAllMocks`. See `tests/servicesContent.test.ts`.
- **`userEvent` hangs under fake timers.** It awaits real timers. Call
  `jest.useFakeTimers()` inside only the `describe` that needs it, never at file
  level. See `tests/MatchOddsView.test.tsx`.
- **`jest.isolateModules` gives a module its own copy of everything it
  imports.** A mock taken from a top-level import is a *different* object than
  the one the isolated module sees. Prefer a unique token or key per test over
  isolation.
- **Module-level caches need fresh modules.** `fetchTeamsCatalog`
  (`services/teams.ts`) and the schedule match index (`services/schedules.ts`)
  memoise in module scope. Their tests use `jest.isolateModules` + `require`.
- **Wait for the branch to settle, not for the request to start.** Asserting
  after "the fetch was called" races the render. Wait for the loading state to
  clear.
- **Route handlers need `@jest-environment node`.** They return a real
  `Response`, which jsdom does not provide. See `tests/routes.test.ts`.

## Files

```
jest.config.cjs                    coverage globs, thresholds, transforms
src/test/setup.ts                  polyfills + global next/* mocks + cleanup
src/test/harness.tsx               renderWithProviders, createTestQueryClient
src/test/nextMocks.tsx             navigation / image / link stubs
src/test/styleStub.js              stylesheet stub
src/tests/*.test.ts(x)             37 suites
```
