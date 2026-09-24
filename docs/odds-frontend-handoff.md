# Odds Intelligence — Frontend handoff (Phase 14.4)

Audience: `apps/web` developers. Backend: `apps/api` (`OddsModule`). Odds is **separate** from editorial and predictions — do not present prices as betting tips.

**Swagger:** `http://localhost:3001/docs` → **odds**  
**Base URL:** `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`) — paths below include prefix **`/api`**.

**Dev data:** `services/ingestion` → `npm run seed:odds-batch -- 6`. Example match id: `sr:match:67132180`.

---

## 1. Sportradar market catalog (Cricket T20 & ODI)

Licensed **Odds Comparison** cricket markets follow Sportradar’s product definitions. Today we ingest and expose only **market #1**; map UI to the vendor name and rules, not a shortened in-house label.

| Nr | Market name (Sportradar) | Our `marketKey` | UI title |
|----|--------------------------|-----------------|----------|
| 1 | **Match winner (incl. super over)** | `match_winner` | Use API `markets[].name` (should match Sportradar); fallback: **Match winner (incl. super over)** |

**Market description (show in expandable “How this market is settled”):**

> All match betting will be settled in accordance with official competition rules. In matches affected by adverse weather, bets will be settled according to the official result.

**Global “Important” notes (same panel or footnote — paraphrase for UI, legal can supply final copy):**

- **Super overs:** For cricket T20/ODI, *most* markets **do not** include super overs **unless the market name says so**. Market #1 **explicitly includes** super over — do not show generic “excludes super over” text on match winner; instead state that **this** market **includes** super over.
- **5-run penalties:** Not counted in any over or delivery market (only relevant when we add those markets later).
- **Minimum overs (T20 & ODI):** At least **90%** of the overs allocated for an innings must have been bowled **at the time the bet was struck** for markets to be settled, unless the innings has reached its natural conclusion (declaration, all out, etc.).
- **Cancellation:** If a match is cancelled before any play, all markets are void unless replayed within **48 hours** of the original start.
- **Tie / no winner:** If tied and official rules do not determine a winner (or winner is by coin toss / drawing of lots), undecided markets are **void**.
- **Incomplete over:** Undecided markets on that over are void unless the innings ended naturally.
- **Incorrect score:** Bookmakers may void bets if markets stayed open on a wrong score that materially affected prices — informational only for users.

**Frontend must:**

1. Render **`markets[].name`** from the API (from feed/DB), not a hard-coded “Match winner”.
2. Add **“Market rules”** disclosure for `match_winner` using the text above (product/legal to finalize wording).
3. Keep **model vs market** clearly labeled: our **prediction model** estimates win probability for the **match outcome**; it is **not** guaranteed to use the same settlement rules as bookmakers (D/L, voids, super over timing). Always show `modelVsMarket.note`.

**Backend / ingestion:** When Sportradar OC mapping is implemented, persist Sportradar’s market name on `odds_markets.name`. Until then, seeds use **Match winner (incl. super over)** so UI matches the catalog.

---

## 2. When to show odds UI

| Condition | UI behaviour |
|-----------|----------------|
| **403** on `GET /odds/:matchId` | No odds module; optional “unavailable in this region/environment”. |
| **200** + `unavailable` string | Empty state + message (no fabricated prices). |
| **200** + `markets.length > 0` | Full comparison UI + market rules. |
| **404** | Bad `matchId` — routing/data issue. |

Always show **`compliance.responsibleUseMessage`** and **`compliance.disclaimer`**.

- **`ageGatingRequired`** → age confirmation before showing prices.
- **`advertisingRestricted`** → no affiliate / “bet now” unless legal approves.

---

## 3. API endpoints

### 3.1 Match odds comparison (primary)

```http
GET /api/odds/{matchId}
```

- **`matchId`:** e.g. `sr:match:67132180` — use `encodeURIComponent(matchId)` in paths.

```ts
interface MatchOddsResponse {
  matchId: string;
  compliance: {
    publicEnabled: boolean;
    regionAllowed: boolean;
    ageGatingRequired: boolean;
    advertisingRestricted: boolean;
    responsibleUseMessage: string;
    disclaimer: string;
  };
  markets: Array<{
    marketKey: string;       // "match_winner"
    marketType: string;
    name: string;            // e.g. "Match winner (incl. super over)"
    bookmakerMargin: number | null;
    selections: Array<{
      selectionKey: string;  // "home" | "away" | "draw"
      label: string;
      current: { decimal; fractional; american; impliedProbability };
      opening: { ... } | null;
      movementPercent: number | null;
      sourceSlug: string;
      sourceName: string;
      capturedAt: string;
      receivedAt: string;
      isBestDisplayedPrice: boolean;
    }>;
  }>;
  modelVsMarket: {
    homeWinProb: number | null;
    awayWinProb: number | null;
    marketHomeImplied: number | null;
    marketAwayImplied: number | null;
    note: string;
  } | null;
  unavailable: string | null;
}
```

**UI:** Group selections by `selectionKey`; sort prices by decimal; badge **“Best displayed price”** only when `isBestDisplayedPrice`. Show **sourceName** + **capturedAt** on every price.

### 3.2 History

```http
GET /api/odds/{matchId}/history?marketKey=match_winner&selectionKey=home&limit=500
```

Line chart: `capturedAt` vs `decimalPrice`, series by `sourceSlug`.

### 3.3 Tools

```http
GET /api/odds/tools/convert?from=decimal&value=2.5
POST /api/odds/tools/margin  { "decimals": [1.91, 1.91] }
```

Match page uses **API** for live comparison; `/tools` may keep client-side math.

---

## 4. Pages & layout

- **`/odds/[match-slug]`** and/or **Odds** tab on match centre.
- Header: **`markets[0].name`** + optional margin chip.
- **Market rules** accordion (Sportradar §1).
- Comparison table + history chart + **Analysis** (`modelVsMarket`) + compliance footer.

Poll live matches every **30–60s**; optional staleness warning from `capturedAt`.

---

## 5. Fetch example

```ts
const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';
const res = await fetch(`${base}/api/odds/${encodeURIComponent(matchId)}`, {
  next: { revalidate: 30 },
});
```

---

## 6. Environment

| Variable | Where |
|----------|--------|
| `NEXT_PUBLIC_API_URL` | `apps/web` |
| `ODDS_PUBLIC_ENABLED=true` | `apps/api` (403 if false) |
| `ODDS_ALLOWED_REGIONS=*` | `apps/api` (dev) |

---

## 7. Out of scope (first slice)

- Over/delivery markets (Sportradar rules differ; super over excluded unless named).
- Movement alerts; admin feed health (`GET /api/admin/odds/sources/health`).

---

## 8. QA checklist

- [ ] Market title matches Sportradar wording for `match_winner`
- [ ] Market rules disclosure visible (incl. super over for this market only)
- [ ] 403 / unavailable / full comparison states
- [ ] Sources + timestamps on every price
- [ ] Model vs market with disclaimer

---

*Backend: `apps/api/src/odds/`. Roadmap: Phase 14 in `docs/Cricket-project-roadmap-progress.md`.*
