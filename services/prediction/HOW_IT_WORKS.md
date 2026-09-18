# How the prediction service works

This is the backend statistical worker (`@cricapp/prediction`). It does **not** call a Sportradar probability API and does **not** use an LLM to invent win chances. It reads sports rows in Postgres (and Redis live state), scores a match, and **inserts** a new run. Old runs are never updated.

Models:

| Stage | Version | Job |
| --- | --- | --- |
| Pre-match | `prematch-logit-v2` | Winner %, score band, XI / leader heuristics, toss adjustment |
| Live | `live-resource-v2` | Winner % from remaining balls/wickets, score band, momentum |

---

## Pipeline

```
upcoming matches (every 15 min, ~30-day horizon)
        │
        ▼
extractPrematchFeatures  →  Platt slope/intercept  →  scorePrematch
        │
        └── persist prediction_runs + features + results  (skip if snapshot unchanged)

Redis live set + match channels (runs / wicket / status / match started)
        │  throttle: same over within 15s is ignored
        ▼
extractLiveFeatures  →  scoreLive (vs previous live %)
        │
        └── persist another append-only run

hourly: fit Platt calibration on settled pre-match runs (min 8 samples)
```

API (`apps/api`) only **reads** those tables. The worker writes.

---

## What “home” means

Every probability is **P(home wins)**. Away is `1 − P(home)`.

Home/away come from the provider competitors (`qualifier: home|away`) when present, otherwise the first two teams on the match row.

---

## Feature formulas (inputs)

### Recent form

Last **8** `team_results` per side, newest first. Each result with a known winner gets exponential decay:

\[
w_i = 0.5^{i} \qquad (i = 0 \text{ is most recent})
\]

\[
\text{form} = \frac{\sum w_i \cdot \mathbf{1}[\text{this team won}]}{\sum w_i}
\]

Missing winners are skipped. No usable results → `0.5`.

**Pre-match uses** \(\text{formEdge} = \text{form}_\text{home} - \text{form}_\text{away}\)  
(range roughly \([-1, 1]\)). Recent wins pull the logit toward that side.

### Head-to-head

Up to **10** meetings. Ignore draws/unknown winners.

\[
\text{h2hEdge} = \frac{\text{homeWins} - \text{awayWins}}{\text{homeWins} + \text{awayWins}}
\]

No decided meetings → `0`. Positive = home has won more of the recent H2H.

### PSL table (only if both teams appear in the same season)

\[
\text{pointsEdge} = \frac{P_\text{home} - P_\text{away}}{14}
\]

\[
\text{nrrEdge} = \frac{\text{NRR}_\text{home} - \text{NRR}_\text{away}}{2}
\]

\[
\text{tableEdge} = 0.7 \cdot \text{pointsEdge} + 0.3 \cdot \text{nrrEdge}
\]

If either side is missing from standings, table is unused (`edge = 0`). This mainly helps **PSL vs PSL**, not random internationals.

### Venue

String match of venue name against team name / country / abbr (tokens length ≥ 4):

- home hint only → `venueEdge = +1`
- away hint only → `venueEdge = -1`
- both or neither → `0`

This is a **home-ground guess**, not a true venue-win% table.

### Toss

After toss is ingested:

- home won toss → `tossEdge = +1`
- away won toss → `tossEdge = -1`
- unknown → `0`

Decision (bat/bowl) is stored but **not** in the logit yet.

### Conditions (pitch / weather text)

Keyword scan of pitch/weather JSON:

| Pattern | Score impact (runs) | Win logit extra |
| --- | --- | --- |
| rain / overcast / cloud / humid / seam | −8 | — |
| dry / flat / batting / hard | +10 | — |
| spin / slow / turn | −6 | — |
| dew | +4 | `winEdge = −0.08` (slight chase help → away-ish if home bats first is **not** modeled; it only nudges the home logit via `conditionsEdge`) |

`conditionsEdge` in the winner model is only that dew `winEdge` (usually `0` or `-0.08`). Run deltas go into the **score range**, not into `z` except through that tiny dew term.

### Format pars (hardcoded)

| Format | Allotted balls | Par score |
| --- | --- | --- |
| T20 (default) | 120 | 160 |
| ODI | 300 | 270 |
| Test | 540 | 320 |

---

## Pre-match winner: logistic regression (hand weights)

### Linear score

\[
z =
1.4\,\text{formEdge}
+ 0.8\,\text{h2hEdge}
+ 0.9\,\text{tableEdge}
+ 0.25\,\text{venueEdge}
+ 0.15\,\text{tossEdge}
+ 0.2\,\text{conditionsEdge}
\]

Weights live in `PREMATCH_WEIGHTS`. They were **chosen by hand**, not fitted on a large match history.

### Platt calibration (optional)

When enough completed matches exist, hourly fit learns `slope` and `intercept`:

\[
z' = a \cdot z + b
\]

Until then \(a = 1\), \(b = 0\) (or env `PREMATCH_CALIBRATION_SLOPE` / `INTERCEPT`). Locked env skips auto-fit.

### Probability

\[
P(\text{home win}) = \sigma(z') = \frac{1}{1 + e^{-z'}}
\]

(`z'` clipped at ±20 inside `sigmoid` so it never overflows.)

**What this does:** turns “who looks stronger on form/table/H2H/toss” into a number between 0 and 1. A \(z\) of `0` is a coin flip. Positive \(z\) favors home.

### Confidence band (not accuracy)

This is **data completeness**, not “how often we were right”:

\[
n = \min(\text{home form sample}, \text{away form sample})
\]

- \(n < 3\) → confidence `0.35` → band **low**
- else \(0.5 + 0.4(1 - e^{-n/8})\) plus `+0.1` if H2H meetings ≥ 3, capped at `0.9`
- ≥ 0.75 **high**, ≥ 0.5 **medium**, else **low**

Few recent results ⇒ we still output a %, but we label it low confidence.

### First-innings score range

\[
\text{expected} = \max(40,\; \text{round}(\text{par} + \text{conditionRuns} + 3 \cdot \text{venueEdge}))
\]

Spread: T20 ±20, ODI ±30, Test ±45.

**What this does:** starts from a format par, nudges for pitch/weather keywords and a crude venue flag. It is not a ball-by-ball innings simulation.

### Top batter / bowler

Eligible squad players, sorted by PSL leader rank when present:

\[
w = \frac{1}{\sqrt{\text{rank}}} \quad \text{or role prior } 0.5 - 0.04 \cdot \text{index}
\]

Then normalize so weights sum to 1. **Ranking heuristic**, not a batting model.

### Playing XI

- Confirmed `match_lineup` → probability `1` for named players, `0` otherwise.
- Else every registered squad member gets \(11 / N\).

---

## Live winner: remaining-resource heuristic

Not Duckworth–Lewis tables. A simple “balls left × wickets left” fraction.

Balls from overs: `floor(overs)*6 + decimal balls` (capped at 5).

\[
\text{ballFrac} = \frac{\text{remainingBalls}}{\text{allottedBalls}}
\]

\[
\text{wicketFrac} = \sqrt{\frac{10 - \text{wicketsLost}}{10}}
\]

\[
\text{resourcesLeft} = \text{clip}_{[0,1]}\big(\text{ballFrac} \cdot (0.35 + 0.65 \cdot \text{wicketFrac})\big)
\]

Wickets in hand shrink remaining “match resource” even if many overs remain.

### Innings 1

Project remaining runs at current RR (or par per ball if RR is 0):

\[
\text{projectedTotal} = \text{runs} + \text{RR} \cdot \text{remainingOvers}
\]

\[
\text{blended} = 0.7 \cdot \text{projectedTotal} + 0.3 \cdot \text{par}
\]

(If the innings is finished, blended = current runs.)

\[
P(\text{batting team wins}) = \sigma\big((\text{blended} - \text{par}) / 25\big)
\]

**What this does:** batting above par → higher win %; below par → lower. The `/25` is a softness knob (larger → probabilities stay closer to 50%).

### Innings 2 (chase)

\[
\text{required} = \max(0,\; \text{target} - \text{runs})
\]

\[
\text{expectedRemaining} = \text{resourcesLeft} \cdot \text{par}
\]

\[
P(\text{batting team wins}) = \sigma\big((\text{expectedRemaining} - \text{required}) / 18\big)
\]

**What this does:** if leftover resource (in “par runs”) covers what is still needed, chase is favored. Wickets and overs both sit inside `resourcesLeft`.

Clamped to `[0.03, 0.97]` so live never prints 0% or 100% until we settle elsewhere.

Then map batting/bowling % onto home/away from who is batting.

### Momentum / pressure (display extras, not the win %)

\[
\text{scoringRate} = \frac{\text{RR}}{\text{par per over}}
\]

\[
\text{wicketPressure} = \min(1,\; \text{wickets}/10)
\]

\[
\text{chasePressure} = \text{clip}\frac{\text{RRR} - \text{RR}}{\text{RRR}} \quad \text{(2nd innings only)}
\]

\[
\text{pressureIndex} = 0.55 \cdot \text{wicketPressure} + 0.45 \cdot \text{chasePressure}
\]

\[
\text{momentum} = \text{clip}_{[-1,1]}\big(0.6(\text{scoringRate}-1) - 0.4 \cdot \text{pressureIndex}\big)
\]

\[
\text{wicketRisk} = \text{clip}_{[0.05,0.95]}(0.12 + 0.55 \cdot \text{pressure} + 0.2 \cdot \text{wicketPressure})
\]

Partnership extra runs ≈ `min(remaining overs, 8) × max(RR, 2) × (1 − wicketRisk)`.

Live confidence is almost fixed: `0.4` if first innings has no overs yet, else `0.55` (**medium**). It does **not** grow as the match gets obvious.

---

## Calibration & “were we right?”

On completed matches, latest pre-match \(z\) vs actual winner. Newton steps fit Platt \(a, b\) (40 iterations), then clamp \(a \in [0.25, 2.5]\), \(b \in [-2, 2]\).

**Brier score** (lower is better; 0 = perfect, 0.25 ≈ coin-flip):

\[
\text{Brier} = \frac{1}{N}\sum_i (p_i - y_i)^2
\]

where \(y_i = 1\) if home won.

**Accuracy** on the performance API: favorite (`p > 0.5`) matches actual winner. Ties at `0.5` are not counted as hits.

Public: `GET /predictions/performance`. Do not quote a % in product copy until `sampleSize` is large.

---

## UI copy (`narrative`) — backend only

The API adds `narrative` + `narrativeSource` on prediction run payloads (`GET /predictions/:matchId`, history, admin run detail). **Win percentages still come only from `prediction_results`.** Copy is generated from the stored snapshot + result, then cached in `prediction_narratives` (not by updating result rows).

- Default: deterministic **template** in `apps/api` (`narrativeSource: "template"`).
- Optional LLM: set `OPENCODE_API_KEY` (OpenCode Go, `https://opencode.ai/zen/go/v1`, default model `glm-5.3-flash`) or `OPENAI_API_KEY`. The model receives the stored brief JSON only. If it emits a `%` that is not in that brief, the API discards it and uses the template.
- Go is billed as a coding-agent subscription; if OpenCode rejects non-coding traffic, keep using the template fallback.

The worker does not call an LLM. This does **not** change the 1–10 accuracy scores above.

---

## Accuracy on a 1–10 scale

These scores are **engineering judgments of the current heuristics**, not a measured leaderboard. Until `GET /predictions/performance` has hundreds of settled matches, treat published “X% accurate” as unsupported.

| Output | Score (1–10) | Why |
| --- | --- | --- |
| **Pre-match match winner** | **4** | Better than a coin flip when form + table + H2H exist (PSL derbies). Hand weights, no trained cricket engine, venue is a name match, toss is ±1 with no bat/bowl. Sparse internationals → closer to **3**. |
| **Live win probability** | **5** mid/late; **3** first few overs | Tracks runs, wickets, overs in a DLS-*shaped* way, so the **direction** of moves is often sensible. Absolute % is not WinViz/CricViz. Par is a constant, not ground-specific. |
| **Score range** | **3** | Format par ± a fixed spread + keyword pitch. Fine as a band, poor as a forecast. |
| **Top batter / bowler** | **3** | Season leader rank + role. Ignores opposition attack, venue, and this match’s XI quality unless leaders exist. |
| **Playing XI** | **8** confirmed lineup / **2** squad heuristic | Confirmed names are reliable. `11/N` on a 15–25 player squad is not a prediction. |
| **Momentum / wicket-risk / partnership** | **3** | Derived indexes for UI explanation, not validated event probabilities. |
| **System overall (MVP)** | **4** | Honest for an internal statistical v1. Not ready to market as “AI accuracy”. |

**What would move the score up:** fit weights on a large settled-match set (log-loss), real DLS/resource tables, venue/format-specific pars, toss decision, trained player models, and only then quote Brier/accuracy from production `prediction_results`.

**What would move it down in production:** empty form/H2H, wrong home/away mapping, missing toss, Redis live state stale (ingestion 403), treating low-confidence bands as high-certainty callouts.

---

## File map

| File | Role |
| --- | --- |
| `src/index.js` | Timers, Redis subscribe, skip unchanged pre-match |
| `src/features.js` | Form, H2H, table, venue, toss, XI, live snapshot |
| `src/prematch.js` | Logit, sigmoid, score range, confidence |
| `src/live.js` | Resource win %, extras |
| `src/calibrate.js` / `src/settle.js` | Platt fit, Brier, favorite accuracy |
| `src/persist.js` | Append-only insert |
| `apps/api` `PredictionNarrativeService` | Template / optional LLM copy for UI |

Unit tests: `npm test` in this folder (or `npm run test --workspace @cricapp/prediction`).
