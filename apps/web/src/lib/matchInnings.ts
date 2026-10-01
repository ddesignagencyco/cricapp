/**
 * Reading a match's innings out of the API payload.
 *
 * ## Why this module exists
 *
 * The match detail page used to show conflicting scores because it had no single
 * definition of "an innings". Three different shapes each claimed to be one:
 *
 * - `teams.home.score` / `teamScores.home.score`
 * - `currentInnings` (`battingTeam` + `runs` + `overs`)
 * - `period_scores[]` inside the match row and inside the timeline
 *
 * For a one-innings-per-side match those three agree. For a Test they cannot.
 *
 * ### The concrete bug this fixes
 *
 * A real Border-Gavaskar Test (`sr:match:53500633`) returns:
 *
 * ```
 * teams.home.score   "342/10"   overs "58.4"   <- 104 + 238, a TWO-innings total
 * teams.away.score   "637/6"    overs "134.3"  <- 150 + 487, a TWO-innings total
 * displayScore       "238/10"                <- Australia's actual 4th innings
 * currentInnings     { runs: 0, overs: 58.4, wickets: 0, battingTeam: "IND" }
 * ```
 *
 * `teams.*.score` is a per-side **aggregate** (`sum` over that side's periods), but
 * it is labelled with a single innings' `overs` and is consumed everywhere as if it
 * were one innings. So the header printed `342/10 (58.4)` for Australia while
 * `displayScore` printed `238/10`, and the scorecard showed four separate innings
 * matching neither. `currentInnings` is worse: it holds `runs: 0` for a match that
 * finished, because a live-only field was never cleared.
 *
 * The fix is to make the **innings** the unit of account. Every score the page
 * prints — headline, comparison, scorecard, match info — is read from an innings
 * this module produced, so they cannot disagree.
 *
 * ## Innings are mapped to teams by stable id, never by array position
 *
 * The timeline payload carries `sport_event.competitors[]` with a stable provider
 * id and a `home`/`away` qualifier, and `statistics.innings[]` with `batting_team`
 * and `bowling_team` set to those same ids. That is the authoritative innings →
 * team mapping and it is used first.
 *
 * Position and name matching are only ever a fallback, and each fallback records
 * which rule produced it in `sideSource` so the page can be tested (and so a future
 * contract change shows up as a changed `sideSource`, not as a silently wrong team
 * name).
 */

import { currentRunRate, formatCricketOvers, oversToBalls } from './cricketMath';

export type SideQualifier = 'home' | 'away';

/** A side of the match, identified by a stable provider id when one exists. */
export type MatchSideRef = {
  id: string;
  name: string;
  code: string;
  qualifier: SideQualifier;
};

/** One `period_scores[]` entry — the provider's own record of one innings. */
export type PeriodScore = {
  number: number;
  homeRuns: number | null;
  homeWickets: number | null;
  awayRuns: number | null;
  awayWickets: number | null;
  /** `display_score`, e.g. `"150/10"`. */
  displayScore: string | null;
  /** `display_overs` — the provider's delivery-aware overs, e.g. `49.4`. */
  displayOvers: number | null;
  /** `allotted_overs` for the innings, when the provider states one. */
  allottedOvers: number | null;
};

/** How the batting side of an innings was resolved. Surfaced for tests and diagnostics. */
export type SideSource =
  | 'competitor-ids'
  | 'period-scores'
  | 'toss'
  | 'current-innings'
  | 'parity'
  | 'unknown';

export type MatchInnings = {
  /** 1-based innings number, as the provider numbers them. */
  number: number;
  /** Which side batted. Null only when nothing in the payload identifies it. */
  side: SideQualifier | null;
  runs: number | null;
  wickets: number | null;
  /**
   * Delivery-aware overs as a number, e.g. `28.4`.
   *
   * Always the provider's `display_overs`, never a completed-over value: a Test
   * innings that ended on the last ball of an over is `49.6` in cricket notation
   * only if 49 overs and 6 balls were bowled, and rounding that to `50` would claim
   * six balls that were never bowled.
   */
  overs: number | null;
  /** `display_overs` normalised for display, e.g. `"28.4"`. */
  oversLabel: string;
  /** `"145/4"`, or empty when the innings has no score yet. */
  score: string;
  /** Derived from `runs` and `overs` above, so it can never contradict them. */
  runRate: number | null;
  allottedOvers: number | null;
  /** True when this innings is not the one in progress. */
  isComplete: boolean;
  sideSource: SideSource;
};

/* ─── Small readers ──────────────────────────────────────────── */

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function asNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Sportradar writes `15.3`; some feeds write a real decimal. Both parse. */
function asOversNumber(value: unknown): number | null {
  return asNumber(value);
}

function cleanId(value: unknown): string {
  return asString(value);
}

/* ─── Payload locations ──────────────────────────────────────── */

/**
 * The timeline payload is wrapped in several ways depending on which endpoint
 * produced it, and the server render seeds the client with the inner object.
 */
export function unwrapTimelinePayload(
  payload: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!payload) return null;
  const nested = asRecord(payload.payload);
  if (nested && (nested.sport_event || nested.timeline || nested.sport_event_timeline)) {
    return nested;
  }
  return payload;
}

function statusBlockOf(payload: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!payload) return null;
  const direct = asRecord(payload.sport_event_status);
  if (direct) return direct;
  const wrapper = asRecord(payload.sport_event_timeline);
  return asRecord(wrapper?.sport_event_status);
}

function eventBlockOf(payload: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!payload) return null;
  return asRecord(payload.sport_event) ?? payload;
}

/**
 * `sport_event.competitors[]`, normalised to `{ home, away }` by the `qualifier`
 * the provider states.
 *
 * Falls back to array position only when the provider omits `qualifier` entirely,
 * and never reorders an explicitly qualified list.
 */
export function readCompetitors(
  payload: Record<string, unknown> | null,
): { home: MatchSideRef | null; away: MatchSideRef | null } {
  const empty = { home: null, away: null };
  if (!payload) return empty;
  const event = eventBlockOf(payload);
  const raw = event?.competitors;
  if (!Array.isArray(raw)) return empty;

  const byQualifier: Record<string, MatchSideRef> = {};
  const positional: MatchSideRef[] = [];
  for (const entry of raw) {
    const rec = asRecord(entry);
    if (!rec) continue;
    const qualifier = asString(rec.qualifier).toLowerCase();
    if (qualifier !== 'home' && qualifier !== 'away') continue;
    const ref: MatchSideRef = {
      id: cleanId(rec.id),
      name: asString(rec.name),
      code: asString(rec.abbreviation) || asString(rec.country_code),
      qualifier,
    };
    if (!byQualifier[qualifier]) byQualifier[qualifier] = ref;
  }

  if (byQualifier.home && byQualifier.away) {
    return { home: byQualifier.home, away: byQualifier.away };
  }

  // No usable qualifier: fall back to the provider's own ordering.
  for (const entry of raw) {
    const rec = asRecord(entry);
    if (!rec) continue;
    positional.push({
      id: cleanId(rec.id),
      name: asString(rec.name),
      code: asString(rec.abbreviation) || asString(rec.country_code),
      qualifier: positional.length === 0 ? 'home' : 'away',
    });
  }
  return { home: positional[0] ?? null, away: positional[1] ?? null };
}

/** `statistics.innings[]`, keyed by innings number, carrying stable team ids. */
export function readStatisticsInnings(
  payload: Record<string, unknown> | null,
): Map<number, { battingTeamId: string; bowlingTeamId: string }> {
  const out = new Map<number, { battingTeamId: string; bowlingTeamId: string }>();
  if (!payload) return out;
  const statistics = asRecord(payload.statistics);
  const innings = statistics?.innings;
  if (!Array.isArray(innings)) return out;
  for (const entry of innings) {
    const rec = asRecord(entry);
    if (!rec) continue;
    const number = asNumber(rec.number);
    const battingTeamId = cleanId(rec.batting_team);
    const bowlingTeamId = cleanId(rec.bowling_team);
    if (number === null) continue;
    if (!battingTeamId && !bowlingTeamId) continue;
    out.set(number, { battingTeamId, bowlingTeamId });
  }
  return out;
}

/**
 * `period_scores[]`, preferring the timeline's copy.
 *
 * The timeline block is the fresher of the two: the match row is written by the
 * summary path and the status block by the timeline path, and during a live match
 * they disagree by a ball or two.
 */
export function readPeriodScores(
  match: Record<string, unknown> | null,
  payload: Record<string, unknown> | null,
): PeriodScore[] {
  const fromTimeline = readPeriodScoreList(statusBlockOf(payload)?.period_scores);
  if (fromTimeline.length > 0) return fromTimeline;
  return readPeriodScoreList(match?.periodScores);
}

function readPeriodScoreList(raw: unknown): PeriodScore[] {
  if (!Array.isArray(raw)) return [];
  const out: PeriodScore[] = [];
  for (const entry of raw) {
    const rec = asRecord(entry);
    if (!rec) continue;
    const number = asNumber(rec.number);
    if (number === null) continue;
    out.push({
      number,
      homeRuns: asNumber(rec.home_score),
      homeWickets: asNumber(rec.home_wickets),
      awayRuns: asNumber(rec.away_score),
      awayWickets: asNumber(rec.away_wickets),
      displayScore: asString(rec.display_score) || null,
      displayOvers: asOversNumber(rec.display_overs),
      allottedOvers: asNumber(rec.allotted_overs),
    });
  }
  return out.sort((a, b) => a.number - b.number);
}

/** The match-level `allotted_overs`, i.e. the innings length for this fixture. */
export function readOversLimit(payload: Record<string, unknown> | null): number | null {
  return asNumber(statusBlockOf(payload)?.allotted_overs);
}

/* ─── Side resolution ────────────────────────────────────────── */

function sideForId(
  competitors: { home: MatchSideRef | null; away: MatchSideRef | null },
  id: string,
): SideQualifier | null {
  if (!id) return null;
  const needle = id.toLowerCase();
  if (competitors.home && competitors.home.id && competitors.home.id.toLowerCase() === needle) {
    return 'home';
  }
  if (competitors.away && competitors.away.id && competitors.away.id.toLowerCase() === needle) {
    return 'away';
  }
  return null;
}

/** Matches a `currentInnings.battingTeam` abbreviation or name to a side. */
function sideForCode(
  competitors: { home: MatchSideRef | null; away: MatchSideRef | null },
  battingTeam: string,
): SideQualifier | null {
  const needle = battingTeam.trim().toLowerCase().replace(/^sr:(competitor|team):/i, '');
  if (needle.length < 2) return null;
  const matches = (ref: MatchSideRef | null) => {
    if (!ref) return false;
    return (
      ref.code.toLowerCase() === needle ||
      (ref.name.length > 0 && ref.name.toLowerCase() === needle)
    );
  };
  const home = matches(competitors.home);
  const away = matches(competitors.away);
  // Ambiguous only when neither or both match; both cannot happen with distinct codes.
  if (home && !away) return 'home';
  if (away && !home) return 'away';
  return null;
}

/**
 * Which side batted first, from the toss.
 *
 * The side that won the toss and chose to bat opened the innings; the side that
 * chose to field sent the other one in. This is a fact about the match rather than
 * an inference from positions, so it is a better parity anchor than "home batted
 * first", and it is what makes a Test's innings 3 and 4 land on the right teams
 * when nothing else identifies them.
 */
export function readToss(
  match: Record<string, unknown> | null,
  payload: Record<string, unknown> | null,
): { side: SideQualifier | null; decision: string } {
  const status = statusBlockOf(payload);
  const winnerId = cleanId(match?.winnerId ?? status?.winner_id ?? match?.tossWonBy ?? status?.toss_won_by);
  const decision = asString(match?.tossDecision ?? status?.toss_decision).toLowerCase();
  if (!winnerId) return { side: null, decision };

  const tossId = cleanId(match?.tossWonBy ?? status?.toss_won_by ?? winnerId);
  const competitors = readCompetitors(payload);
  const tossSide = sideForId(competitors, tossId);
  if (!tossSide) return { side: null, decision };

  if (decision === 'bat' || decision === 'batting') return { side: tossSide, decision };
  if (decision === 'bowl' || decision === 'field' || decision === 'bowling' || decision === 'fielding') {
    return { side: tossSide === 'home' ? 'away' : 'home', decision };
  }
  return { side: null, decision };
}

type SideResolution = { side: SideQualifier | null; source: SideSource };

/**
 * Resolves the batting side for one innings, trying the strongest evidence first.
 */
function resolveSide(
  inningsNumber: number,
  period: PeriodScore | null,
  context: {
    competitors: { home: MatchSideRef | null; away: MatchSideRef | null };
    statistics: Map<number, { battingTeamId: string; bowlingTeamId: string }>;
    tossFirstBattingSide: SideQualifier | null;
    currentInningsSide: SideQualifier | null;
    highestInnings: number;
  },
): SideResolution {
  // 1. Stable competitor ids from `statistics.innings[]`. Authoritative.
  const stats = context.statistics.get(inningsNumber);
  if (stats) {
    const byBatting = sideForId(context.competitors, stats.battingTeamId);
    if (byBatting) return { side: byBatting, source: 'competitor-ids' };
    const byBowling = sideForId(context.competitors, stats.bowlingTeamId);
    if (byBowling) return { side: byBowling === 'home' ? 'away' : 'home', source: 'competitor-ids' };
  }

  // 2. The side that actually scored in this period. Both a zero and a missing
  //    value are ambiguous, so only an unambiguous period decides.
  if (period) {
    const homeScored = (period.homeRuns ?? 0) > 0;
    const awayScored = (period.awayRuns ?? 0) > 0;
    if (homeScored !== awayScored) {
      return { side: homeScored ? 'home' : 'away', source: 'period-scores' };
    }
  }

  // 3. `currentInnings.battingTeam` — authoritative for the innings in progress,
  //    which is the highest-numbered one. It is a live-only field that goes stale
  //    the moment a match ends, so it is only consulted for that single innings.
  if (context.currentInningsSide && inningsNumber === context.highestInnings) {
    return { side: context.currentInningsSide, source: 'current-innings' };
  }

  return { side: null, source: 'unknown' };
}

/* ─── The innings list ───────────────────────────────────────── */

function scoreText(runs: number | null, wickets: number | null, displayScore: string | null): string {
  if (displayScore) return displayScore;
  if (runs === null) return '';
  if (wickets === null) return String(runs);
  return `${runs}/${wickets}`;
}

function runsFromScore(score: string): number | null {
  const m = score.match(/^\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

function wicketsFromScore(score: string): number | null {
  const m = score.match(/^\s*\d+\s*\/\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

export type BuildInningsInput = {
  match: Record<string, unknown> | null | undefined;
  timeline?: Record<string, unknown> | null;
  /** True only while the match is actually in progress. */
  isLive?: boolean;
};

/**
 * The match's innings, in order, each mapped to the side that batted it.
 *
 * This is the single list every score on the page is read from.
 */
export function buildMatchInnings({
  match,
  timeline,
  isLive = false,
}: BuildInningsInput): MatchInnings[] {
  const payload = unwrapTimelinePayload(timeline ?? null);
  const competitors = readCompetitors(payload);
  const statistics = readStatisticsInnings(payload);
  const periods = readPeriodScores(match ?? null, payload);
  const oversLimit = readOversLimit(payload);
  const status = statusBlockOf(payload);
  const currentInningsSide = sideForCode(
    competitors,
    asString((match?.currentInnings as Record<string, unknown> | null)?.battingTeam),
  );
  const toss = readToss(match ?? null, payload);
  const highestInnings = periods.length > 0 ? periods[periods.length - 1].number : 0;

  // Everything the payload can tell us about the innings in progress, taken as a
  // block so the score, the wickets and the overs always describe the same moment.
  const liveRuns = asNumber((match?.currentInnings as Record<string, unknown> | null)?.runs);
  const liveWickets = asNumber((match?.currentInnings as Record<string, unknown> | null)?.wickets);
  const liveOvers = asOversNumber((match?.currentInnings as Record<string, unknown> | null)?.overs);
  const liveScore = asString(status?.display_score) || asString(match?.displayScore) || null;
  const liveOversFromStatus = asOversNumber(status?.display_overs);

  return periods.map((period) => {
    const resolved = resolveSide(period.number, period, {
      competitors,
      statistics,
      tossFirstBattingSide: toss.side,
      currentInningsSide,
      highestInnings,
    });

    // Parity fill: an innings nothing identified is assigned by alternating from the
    // best anchor available. This is the last resort and is labelled as such.
    let side = resolved.side;
    let sideSource = resolved.source;
    if (side === null) {
      const anchor = firstBattingSideAnchor(periods, competitors, statistics, toss.side);
      if (anchor) {
        const offset = period.number - periods[0].number;
        side = offset % 2 === 0 ? anchor : anchor === 'home' ? 'away' : 'home';
        sideSource = toss.side ? 'toss' : 'parity';
      }
    }

    const isHighest = period.number === highestInnings;
    // The innings in progress is the last one only while the match is live. Once
    // the match is over it is a completed innings like any other.
    const inProgress = isLive && isHighest;

    let runs = period.homeRuns !== null || period.awayRuns !== null
      ? side === 'home'
        ? period.homeRuns
        : side === 'away'
          ? period.awayRuns
          : firstNonZero(period.homeRuns, period.awayRuns)
      : runsFromScore(period.displayScore ?? '');

    let wickets = side === 'home' ? period.homeWickets : side === 'away' ? period.awayWickets : null;
    let overs = period.displayOvers;
    let score = period.displayScore;

    if (inProgress) {
      // Overlay the live block, keeping the two sources consistent: take the
      // source that is further along in BALLS, then read every field from it.
      const ballsFromStatus = oversToBalls(liveOversFromStatus ?? NaN);
      const ballsFromPeriod = oversToBalls(period.displayOvers ?? NaN);
      const statusWins =
        ballsFromStatus !== null && (ballsFromPeriod === null || ballsFromStatus > ballsFromPeriod);
      const sourceRuns = statusWins ? runsFromScore(liveScore ?? '') : liveRuns;
      const sourceWickets = statusWins ? wicketsFromScore(liveScore ?? '') : liveWickets;
      const sourceOvers = statusWins ? liveOversFromStatus : liveOvers ?? period.displayOvers;

      if (sourceRuns !== null) runs = sourceRuns;
      if (sourceWickets !== null) wickets = sourceWickets;
      if (sourceOvers !== null) overs = sourceOvers;
      score = scoreText(runs, wickets, null);
    }

    if (runs === null && score) runs = runsFromScore(score);
    if (wickets === null && score) wickets = wicketsFromScore(score);

    const oversLabel = formatCricketOvers(overs);

    return {
      number: period.number,
      side,
      runs: runs ?? null,
      wickets: wickets ?? null,
      overs: overs ?? null,
      oversLabel,
      score: scoreText(runs, wickets, score),
      // `currentRunRate` takes cricket-notation overs and does the balls
      // conversion itself, so it is handed `overs` — not a ball count or a
      // decimal. Converting first and then letting it convert again turns 49.4
      // into 50.1667 and understates every rate by 2%.
      runRate: runs !== null && overs !== null ? currentRunRate(runs, overs) : null,
      allottedOvers: period.allottedOvers ?? oversLimit,
      isComplete: !inProgress,
      sideSource,
    };
  });
}

function firstNonZero(...values: Array<number | null>): number | null {
  for (const value of values) {
    if (value !== null && value !== 0) return value;
  }
  return values.find((value) => value !== null) ?? null;
}

/** The best available answer to "who batted first", used only for parity fill. */
function firstBattingSideAnchor(
  periods: PeriodScore[],
  competitors: { home: MatchSideRef | null; away: MatchSideRef | null },
  statistics: Map<number, { battingTeamId: string; bowlingTeamId: string }>,
  tossFirstBattingSide: SideQualifier | null,
): SideQualifier | null {
  for (const period of periods) {
    const stats = statistics.get(period.number);
    if (stats) {
      const byId = sideForId(competitors, stats.battingTeamId);
      if (byId) return byId;
    }
    const homeScored = (period.homeRuns ?? 0) > 0;
    const awayScored = (period.awayRuns ?? 0) > 0;
    if (homeScored !== awayScored) return homeScored ? 'home' : 'away';
  }
  if (tossFirstBattingSide) return tossFirstBattingSide;
  return competitors.home ? 'home' : competitors.away ? 'away' : null;
}

/** The last innings a side batted — the one a scoreboard headline should show. */
export function latestInningsFor(
  innings: MatchInnings[],
  side: SideQualifier,
): MatchInnings | null {
  for (let i = innings.length - 1; i >= 0; i -= 1) {
    if (innings[i].side === side) return innings[i];
  }
  return null;
}
