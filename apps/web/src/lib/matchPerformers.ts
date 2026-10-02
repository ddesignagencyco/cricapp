/**
 * Who stood out, and the short factual summary of the match.
 *
 * ## Why the rules are written down
 *
 * "Top batter" and "top bowler" are the two most-read numbers on a match page, and
 * both are derivable from the real scorecard. They are computed here with explicit,
 * deterministic tie-breaks so the same match always produces the same two names —
 * a leaderboard that reshuffles on every render reads as a bug to a reader and is
 * impossible to test.
 *
 * Nothing in this module invents a performance. If the scorecard has no bowling
 * rows there is no top bowler, and the card is not rendered.
 */

import { formatCricketOvers, oversToBalls } from './cricketMath';
import type { InningsScorecard } from './matchCentreData';
import type { MatchInnings, SideQualifier } from './matchInnings';

/* ─── Aggregation helpers ────────────────────────────────────── */

function toNum(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export type BatterFigure = {
  id: string;
  name: string;
  /** Runs across every innings the batter played in this match. */
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  /** Recomputed from the aggregated runs and balls, never averaged. */
  strikeRate: number;
  innings: number;
  dismissed: boolean;
  /**
   * Every side this player batted for, resolved from the innings labels.
   *
   * In a Test a player can appear for the same side twice, and a neutral match can
   * put players on both. It is a list rather than a single side so the UI can say
   * "both" rather than picking one and being wrong half the time.
   */
  sides: SideQualifier[];
};

export type BowlerFigure = {
  id: string;
  name: string;
  wickets: number;
  runs: number;
  maidens: number;
  /** Total overs bowled, kept as legal balls so 4 overs + 3 balls is 4.3. */
  balls: number;
  overs: string;
  economy: number | null;
  innings: number;
  sides: SideQualifier[];
};

/**
 * Maps a scorecard's team label to a side.
 *
 * The scorecard labels each innings with a team *name*; the view model knows which
 * side that name belongs to. Injecting the mapping keeps these functions pure and
 * stops them guessing a side from a player's name.
 */
export type SideResolver = (_teamName: string) => SideQualifier | null;

function addSide(existing: SideQualifier[], side: SideQualifier | null): SideQualifier[] {
  if (!side || existing.includes(side)) return existing;
  return [...existing, side];
}

/** The side to show for a figure: its only side, or "both" when it played for two. */
export function figureSideLabel(
  sides: SideQualifier[],
  sideName: (_side: SideQualifier) => string,
): string {
  if (sides.length === 0) return '';
  if (sides.length > 1) return 'Both sides';
  return sideName(sides[0]);
}

function batterKey(row: { id?: string; name: string }): string {
  const id = String(row.id ?? '').trim();
  if (id) return `id:${id}`;
  return `name:${String(row.name ?? '').trim().toLowerCase()}`;
}

function bowlerKey(row: { id?: string; name: string }): string {
  const id = String(row.id ?? '').trim();
  if (id) return `id:${id}`;
  return `name:${String(row.name ?? '').trim().toLowerCase()}`;
}

/**
 * A side's batting across the whole match.
 *
 * A batter who made 100 and 60 in a Test finished on 160, so figures are summed
 * and the strike rate is recomputed from the totals. Averaging the per-innings
 * strike rates would understate a batter who got out cheaply in one innings.
 */
export function aggregateBatters(cards: InningsScorecard[], resolveSide?: SideResolver): BatterFigure[] {
  const totals = new Map<string, BatterFigure>();
  for (const card of cards) {
    const side = resolveSide?.(card.battingTeam) ?? null;
    for (const row of card.batting) {
      const name = String(row.name ?? '').trim();
      if (!name) continue;
      const key = batterKey(row);
      const runs = toNum(row.runs) ?? 0;
      const balls = toNum(row.balls) ?? 0;
      const existing = totals.get(key);
      if (existing) {
        existing.runs += runs;
        existing.balls += balls;
        existing.fours += toNum(row.fours) ?? 0;
        existing.sixes += toNum(row.sixes) ?? 0;
        existing.innings += 1;
        existing.sides = addSide(existing.sides, side);
        if (row.out) existing.dismissed = true;
      } else {
        totals.set(key, {
          id: String(row.id ?? '').trim(),
          name,
          runs,
          balls,
          fours: toNum(row.fours) ?? 0,
          sixes: toNum(row.sixes) ?? 0,
          strikeRate: 0,
          innings: 1,
          dismissed: Boolean(row.out),
          sides: side ? [side] : [],
        });
      }
    }
  }
  return [...totals.values()]
    .map((figure) => ({
      ...figure,
      strikeRate: figure.balls > 0 ? Number(((figure.runs / figure.balls) * 100).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.runs - a.runs);
}

/**
 * A side's bowling across the whole match.
 *
 * Overs are summed as legal balls, not as decimals: a bowler's 4 overs and 3 balls
 * plus 4 overs and 3 balls is 8.6, and adding the two printed decimals would give
 * 8.6 + 8.3 = 16.9 and then print "17", inventing six balls.
 */
export function aggregateBowlers(cards: InningsScorecard[], resolveSide?: SideResolver): BowlerFigure[] {
  const totals = new Map<string, BowlerFigure>();
  for (const card of cards) {
    const side = resolveSide?.(card.bowlingTeam) ?? null;
    for (const row of card.bowling) {
      const name = String(row.name ?? '').trim();
      if (!name) continue;
      const key = bowlerKey(row);
      const balls = oversToBalls(toNum(row.overs) ?? NaN) ?? 0;
      const existing = totals.get(key);
      if (existing) {
        existing.wickets += toNum(row.wickets) ?? 0;
        existing.runs += toNum(row.runs) ?? 0;
        existing.maidens += toNum(row.maidens) ?? 0;
        existing.balls += balls;
        existing.innings += 1;
        existing.sides = addSide(existing.sides, side);
      } else {
        totals.set(key, {
          id: String(row.id ?? '').trim(),
          name,
          wickets: toNum(row.wickets) ?? 0,
          runs: toNum(row.runs) ?? 0,
          maidens: toNum(row.maidens) ?? 0,
          balls,
          // Recomputed in the map below once every innings has been added. Setting
          // it here would freeze the figure at the bowler's first innings, so a Test
          // bowler taking 8/72 across 18 + 12 overs would read "in 18 ov" beside an
          // economy of 2.40 — two numbers describing different spans of the match.
          overs: '',
          economy: null,
          innings: 1,
          sides: side ? [side] : [],
        });
      }
    }
  }
  return [...totals.values()]
    .map((figure) => ({
      ...figure,
      overs: formatCricketOvers(figure.balls / 6) || '0',
      // `balls` is a ball count here, so the rate is runs per six balls. Handing
      // `balls / 6` to `currentRunRate` would convert a second time and round
      // 6.3 overs up to 6.5, understating the economy.
      economy: figure.balls > 0 ? figure.runs / (figure.balls / 6) : null,
    }))
    .sort((a, b) => b.wickets - a.wickets);
}

/* ─── Top performers ─────────────────────────────────────────── */

/**
 * The match's highest scorer.
 *
 * Most runs, then the higher strike rate. The third key is the name, purely so
 * two batters on identical figures cannot swap places between renders.
 */
export function topBatter(cards: InningsScorecard[], resolveSide?: SideResolver): BatterFigure | null {
  const figures = aggregateBatters(cards, resolveSide).filter((figure) => figure.runs > 0);
  if (figures.length === 0) return null;
  return [...figures].sort(
    (a, b) => b.runs - a.runs || b.strikeRate - a.strikeRate || a.name.localeCompare(b.name),
  )[0];
}

/**
 * The match's leading wicket-taker.
 *
 * Most wickets, then the lower economy, then the fewer runs conceded. A bowler
 * who took three wickets for 40 and one who took three for 60 are separated by
 * economy, which is the tie-break a reader would apply themselves.
 */
export function topBowler(cards: InningsScorecard[], resolveSide?: SideResolver): BowlerFigure | null {
  const figures = aggregateBowlers(cards, resolveSide).filter((figure) => figure.wickets > 0);
  if (figures.length === 0) return null;
  return [...figures].sort(
    (a, b) =>
      b.wickets - a.wickets ||
      (a.economy ?? Number.POSITIVE_INFINITY) - (b.economy ?? Number.POSITIVE_INFINITY) ||
      a.runs - b.runs ||
      a.name.localeCompare(b.name),
  )[0];
}

/** The top `count` batters, for the highlights table. */
export function topBatters(cards: InningsScorecard[], count: number, resolveSide?: SideResolver): BatterFigure[] {
  return aggregateBatters(cards, resolveSide)
    .filter((figure) => figure.runs > 0)
    .slice(0, count);
}

/** The top `count` bowlers, for the highlights table. */
export function topBowlers(cards: InningsScorecard[], count: number, resolveSide?: SideResolver): BowlerFigure[] {
  return aggregateBowlers(cards, resolveSide)
    .filter((figure) => figure.wickets > 0 || figure.runs > 0)
    .slice(0, count);
}

/**
 * The Player of the Match, but only when the API actually names one.
 *
 * The match payload has no `playerOfTheMatch` field — the closest structured
 * value is `winnerId`, which is a *team* competitor id. Naming a player from that
 * would be a fabrication, and a match centre that invents an award is worse than
 * one that quietly omits it. So this returns the API's value or nothing, and the
 * card is only rendered when there is something to render.
 */
export function playerOfTheMatch(match: Record<string, unknown> | null | undefined): {
  name: string;
  id: string;
} | null {
  if (!match) return null;
  const rec = match as Record<string, unknown>;
  const nested = rec.playerOfTheMatch as Record<string, unknown> | null | undefined;
  if (nested && typeof nested === 'object') {
    const name = String(nested.name ?? nested.fullName ?? '').trim();
    if (name) return { name, id: String(nested.id ?? nested.playerId ?? '').trim() };
  }
  const name = String(rec.playerOfTheMatchName ?? rec.manOfTheMatch ?? '').trim();
  if (name) return { name, id: String(rec.playerOfTheMatchId ?? '').trim() };
  return null;
}

/* ─── Innings comparison ─────────────────────────────────────── */

export type InningsComparisonRow = {
  innings: MatchInnings;
  side: SideQualifier | null;
  teamName: string;
  teamCode: string;
  score: string;
  overs: string;
  runRate: number | null;
  /**
   * Bar width as a percentage of the biggest innings in the match.
   *
   * It is deliberately scaled against the largest innings rather than against the
   * opposing side, because innings of a Test are not comparable to each other: an
   * 8-wicket second innings of 20 runs and a first innings of 480 are not "4%" of
   * each other in any sense a reader would use. The score is printed beside the
   * bar, so the bar ranks the innings and never substitutes for the number.
   */
  percent: number;
};

export function buildInningsComparison(
  innings: MatchInnings[],
  sideName: (_side: SideQualifier | null) => { name: string; code: string },
): InningsComparisonRow[] {
  const maxRuns = innings.reduce((max, inn) => Math.max(max, inn.runs ?? 0), 0);
  return innings.map((inn) => {
    const side = sideName(inn.side);
    return {
      innings: inn,
      side: inn.side,
      teamName: side.name,
      teamCode: side.code,
      score: inn.score,
      overs: inn.oversLabel,
      runRate: inn.runRate,
      percent: maxRuns > 0 ? Math.round(((inn.runs ?? 0) / maxRuns) * 100) : 0,
    };
  });
}

/* ─── Factual match summary ──────────────────────────────────── */

export type MatchSummaryInput = {
  innings: MatchInnings[];
  winnerName: string;
  result: string;
  status: string;
  venue: string;
  topBatterName: string;
  topBatterRuns: number | null;
  topBowlerName: string;
  topBowlerWickets: number | null;
};

function ordinal(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  if (n === 4) return '4th';
  return `${n}th`;
}

/**
 * A short, factual overview of the match.
 *
 * Used only when the project has no editorial summary for the fixture. Every clause
 * is taken from a value the API returned — the result line, the innings scores, the
 * venue, the top performers. It describes what the scorecard shows and stops there:
 * it never narrates a momentum shift, a turning point or a piece of cricket that
 * the payload does not contain.
 */
export function factualMatchSummary(input: MatchSummaryInput): string {
  const sentences: string[] = [];

  const result = input.result.trim();
  if (result) {
    sentences.push(result.endsWith('.') ? result : `${result}.`);
  } else if (input.status === 'completed') {
    sentences.push('The match finished without an official result recorded.');
  }

  const scores = input.innings
    .filter((inn) => inn.score)
    .map((inn) => `${ordinal(inn.number)} innings, ${inn.score}${inn.oversLabel ? ` (${inn.oversLabel} overs)` : ''}`);
  if (scores.length > 0) {
    sentences.push(`Innings: ${scores.join('; ')}.`);
  }

  if (input.venue) {
    sentences.push(`Played at ${input.venue}.`);
  }

  if (input.topBatterName && input.topBatterRuns !== null) {
    const bowler =
      input.topBowlerName && input.topBowlerWickets !== null
        ? `, while ${input.topBowlerName} took ${input.topBowlerWickets} wicket${input.topBowlerWickets === 1 ? '' : 's'}`
        : '';
    sentences.push(`${input.topBatterName} top-scored with ${input.topBatterRuns}${bowler}.`);
  } else if (input.topBowlerName && input.topBowlerWickets !== null) {
    sentences.push(
      `${input.topBowlerName} took ${input.topBowlerWickets} wicket${input.topBowlerWickets === 1 ? '' : 's'}.`,
    );
  }

  return sentences.join(' ').replace(/\s+/g, ' ').trim();
}
