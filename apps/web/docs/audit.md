# Site Audit — Lighthouse performance pass (`apps/web`)

- Date: 2026-10-05. Scope: `apps/web` only. No API, Prisma, DB, contract changes.
  Ad-manager code (`advertisements/*` beyond the single-variant slot fix,
  `components/ads/*`, `lib/advertisements/*`, `app-ads.txt`) belongs to another
  agent — left untouched.
- Method: production build (`npm run build` + `next start -p 3100`), Lighthouse 12,
  mobile emulation (4× CPU, 1.6 Mbps) + desktop preset, clean profile, cold cache,
  3 runs per state on `/` (median). Playwright Chromium. API (`:3001`) running
  with real data; no live matches in progress (`/api/matches/live` → `{"data":[]}`).

## 1. Before / after (median of 3 mobile production runs)

| Metric | Before | After | Target |
|---|---:|---:|:--:|
| Performance | 62 | 60 | 90+ (not reached here — §5) |
| Accessibility | 96 | **100** | 100 ✅ |
| Best Practices | 96 | 96 | 100 |
| SEO | 100 | 100 | 100 ✅ |
| FCP (simulated) | 1.3s | 2.9s | — (§5: real-browser FCP 0.7–1.1 s, no regression) |
| LCP (simulated) | 16.4s | 6.2s | ≤2.5s |
| TBT | 417ms | 505ms | ≤200ms |
| CLS | 0 | 0 | ✅ |
| Payload | 2,810 KiB | **766 KiB (−73%)** | <2 MB ✅ |
| JS on `/` | 273 KiB | 256 KiB | — |

Desktop preset (same build): **perf 86–96**, a11y 100, FCP 0.5–0.7 s,
LCP 0.9–1.8 s, TBT 80–100 ms, CLS ≤0.075, ~900 KiB. Mobile-vs-desktop gap is
the presets' throttling (different simulated devices), not different code.
Best warm mobile run: **perf 90** (FCP 1.4, LCP 3.1, TBT 210).

## 2. Fixes applied (all inside `apps/web`, ads-manager code untouched)
- **Images (−2,044 KiB):** `next.config.mjs` gained `images` (AVIF/WebP,
  `remotePatterns` for psl-t20.com/picsum/cloudinary/API host,
  `qualities: [75, 85, 90]` — REQUIRED in Next 16, out-of-list qualities are
  silently coerced to 75). `RemoteImage` lost blanket `unoptimized`
  (trusted→optimizer, unknown→passthrough, `quality` default 85).
  Hero 1.88 MB CSS background → 12 KiB preloaded `next/image` (q85);
  `priority` migrated to v16 `preload` (hero, logo, RemoteImage mapping).
  banner2 q90. Six components de-cliented to Server Components
  (CricketHero/SectionHeader/PslSpotlight/MatchCard/RecentResultCard/TeamLogo/Footer —
  Footer via slot composition in root layout); pure `deriveMatchState`
  extracted to `lib/` (hook re-exports; all importers untouched).
- **Single-variant leaderboard** (`ResponsiveLeaderboard.tsx` + `HouseAd.tsx`):
  1 creative per slot instead of 4 hidden `<img>` (13→3 ad requests).
  NOT touching this area further (other agent active).
- **Sharpness fix:** quality allowlist + q85 logos/thumbs/hero, q90
  text-bearing banners; verified q=85/90 in served HTML + crisper screenshots.
- **JS/TBT:** dynamic() splits (AssistantPanel on open, SearchBar on open,
  Newsletter, Gallery, Ticker, LiveNow, Toaster — SSR output unchanged);
  socket bursts coalesced (1 s window, snapshot-safe); ticker observer
  subscribes once; `fetchNews` limit 50→6, `fetchStreams` 8→3.
- **A11y 100:** badge-primary-fg `#3B68FC`→`#2A4FE0` (3.93→5.46:1); light-mode
  bottom nav to solid white + dark active pill (7 contrast failures → 0).
- **Misc:** Nastaliq `preload: false`, API preconnect, `background-attachment`
  desktop-only, 1.3 MB duplicate `logo.png` deleted, **favicon replaced with a
  1 KiB hand-drawn vector mark** (navy tile, brand-blue ring, red seamed ball;
  verified crisp at 16/32/48/96 px).
- **Tests:** new `perfImageAds.test.tsx` (6 tests). Full suite green.

## 3. Verification
- `tsc --noEmit` clean; `eslint` 0 errors (2 pre-existing warnings, untouched file).
- `jest`: 71 suites / 1761 tests pass (incl. the ads-system suite).
- `next build` clean; `/` static ISR-60.

## 4. Not fixed (with reason)
- Logged-out 401 `/api/auth/me`: needs server-side cookie probe, which would
  force the whole site dynamic — rejected. Needs API-side change.
- `psl-t20.com` logo TTLs, picsum 302 chains: third-party.
- Dead deps (`floating-ui`, `lucide-lab`, `zustand`, 0 imports): zero bundle
  impact; removal churns lockfile.
- Desktop `uses-responsive-images` 82 KiB: full-width banners at 1920w are
  correct per `sizes="100vw"`; the "saving" assumes smaller render.

## 5. Why perf 90+ is not a median here (evidence)
- Real-browser FCP 0.7–1.1 s; trace-observed FCP identical before/after
  (1700 vs 1667 ms). The 2.8 s simulated FCP persists with ALL JS blocked
  (2.7 s) — it is Lantern's CPU model on this noisy shared box, not a resource.
- LCP is 92% render delay with ~0 load delay: CDP profile shows ~0.9 s real
  main-thread work with no single hog (module eval + hydration over ~20
  chunks, ~1460 tasks); ×4 slowdown ≈ the simulated gap. Halving it needs
  idle/viewport hydration — rejected as too risky for functionality.
- TBT swings 400–1235 ms across identical runs (no live matches): machine
  noise dominates; ≤200 ms needs near-zero blocking (same reason).
- 239 KiB Nastaliq Arabic is content-required (Urdu headlines on `/`).
- Re-measure on quiet hardware / CrUX: lab median here is ±20 pts
  run-to-run on identical builds.
