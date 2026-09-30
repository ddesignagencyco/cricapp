'use client';

import { useMemo } from 'react';
import { currentRunRate, formatCricketOvers, isFurtherAlong } from '../lib/cricketMath';
import { timelineInningsState } from '../lib/matchTimelineState';
import { mergeMatchLivePayload, useMatchStream } from './useMatchStream';

/**
 * One derived state per match, shared by every surface.
 *
 * The site had three ways to show a live score and each normalised it differently: the
 * match detail header read the match row, the commentary read the timeline, and the
 * home card re-derived it from the socket payload. Because the match row and the
 * timeline are written by different backend paths they can be a ball or two apart, so
 * the three surfaces drifted — the same match showing `6 ov` on the homepage and `6.4`
 * on its own page.
 *
 * Everything now goes through here. Two rules make it consistent:
 *
 * 1. **One winner.** When the match row and the timeline disagree, whichever is further
 *    along *in balls* wins. Comparing raw numbers is wrong: `29` and `28.6` are the
 *    same 174 balls.
 * 2. **One spelling.** The label is always normalised by `formatCricketOvers`, so
 *    5 overs and 6 balls prints as `6` everywhere rather than `5.6` in one place and
 *    `6` in another. Six balls *is* a completed over.
 */
export type MatchState = {
  isLive: boolean;
  /** Runs in the live innings, or null when there is no innings. */
  runs: number | null;
  /** Overs normalised for display, e.g. `6` or `7.5`. Empty when unknown. */
  oversLabel: string;
  /** `51/0`, as the provider writes it. */
  score: string | null;
  wickets: number | null;
  /** Which side is batting. */
  battingTeam: string;
  /**
   * Whether the batting side is the home side. Cards need this to decide which
   * innings' overs to show, and re-deriving it per surface is how the card and the
   * match page ended up swapping sides.
   */
  battingIsHome: boolean;
  runRate: number | null;
};

const EMPTY_STATE: MatchState = {
  isLive: false,
  runs: null,
  oversLabel: '',
  score: null,
  wickets: null,
  battingTeam: '',
  battingIsHome: false,
  runRate: null,
};

function toNumber(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function text(value: unknown): string | null {
  const s = String(value ?? '').trim();
  return s && s !== '—' ? s : null;
}

export function deriveMatchState(
  match: Record<string, unknown> | null | undefined,
  timeline?: Record<string, unknown> | null,
): MatchState {
  if (!match) return EMPTY_STATE;

  const status = String(match.status ?? '').trim().toLowerCase();
  const isLive = status === 'live';

  const inn = (match.currentInnings ?? null) as Record<string, unknown> | null;
  const rowWickets = toNumber(inn?.wickets);

  // `currentInnings` describes the *live* innings. Once the match is finished it is
  // stale — it still holds the last thing seen mid-match — so a completed result must
  // be read from the match-level fields instead.
  const rowOvers = isLive ? toNumber(inn?.overs) : toNumber(match.displayOvers);

  // The timeline only knows the live innings, so it is ignored unless the match is in
  // progress — otherwise a stale payload would overwrite a completed innings.
  const tl = isLive ? timelineInningsState(timeline ?? null) : null;
  const timelineWins = tl !== null && isFurtherAlong(tl.overs, rowOvers);

  // The API returns several score fields inside one response and they do not always
  // agree. Measured on a live ODI, a single `GET /matches/:id` returned:
  //
  //   displayScore             288/1
  //   currentInnings           292/1
  //   currentInnings.runRate   10.13   (implies 287 runs)
  //   teams.home.score         292/1
  //   timeline status          288/1
  //   timeline last event      292/1
  //
  // So the choice of source has to be made **once** and then every field read from that
  // same source. Previously the score came from `displayScore` while the runs came from
  // `currentInnings`, which is how a single card could print one score in its heading
  // and a different one underneath — and how the homepage and the match page drifted a
  // ball apart while looking at the same match.
  const winner = pickScoreSource({ match, isLive, rowOvers, timelineWins, tl, home: isHomeBatting(match) });

  return {
    isLive,
    runs: winner.runs,
    oversLabel: formatCricketOvers(winner.overs),
    score: winner.score,
    wickets: winner.wickets ?? (isLive ? rowWickets : null) ?? null,
    battingTeam: isLive ? String(inn?.battingTeam ?? '').trim() : '',
    battingIsHome: isLive ? isHomeBatting(match) : false,
    // Derived from the same reconciled runs and overs, for the same reason as `score`:
    // a stored `runRate` is written separately and lags, so pairing it with a reconciled
    // score produces a run rate that contradicts the line above it.
    runRate: isLive ? currentRunRate(winner.runs ?? 0, winner.overs ?? 0) ?? toNumber(inn?.runRate) : null,
  };
}

type Source = {
  runs: number | null;
  overs: number | null;
  wickets: number | null;
  score: string | null;
};

/**
 * Chooses which field family to believe, then reads every value from it.
 *
 * The winner is the source that is furthest along in **ball count**, because runs alone
 * cannot be compared: a slower over produces fewer runs for the same number of balls, so
 * comparing totals would let a stale 292 beat a current 288.
 */
function pickScoreSource(input: {
  match: Record<string, unknown>;
  isLive: boolean;
  rowOvers: number | null;
  timelineWins: boolean;
  tl: { runs: number | null; overs: number | null; score: string | null } | null;
  home: boolean;
}): Source {
  const { match, isLive, rowOvers, timelineWins, tl, home } = input;
  const inn = (match.currentInnings ?? null) as Record<string, unknown> | null;

  const fromTimeline: Source = tl
    ? { runs: tl.runs, overs: tl.overs, wickets: parseWkts(tl.score), score: text(tl.score) }
    : { runs: null, overs: null, wickets: null, score: null };

  const fromInnings: Source = {
    runs: toNumber(inn?.runs),
    overs: rowOvers,
    wickets: toNumber(inn?.wickets),
    score: null,
  };

  // The match row carries the published score string, which can lag `currentInnings`
  // because the two are written by different paths.
  const fromRow: Source = {
    runs: parseRuns(text(match.displayScore)) ?? parseRuns(teamScoreFor(match, home)),
    overs: toNumber(match.displayOvers) ?? rowOvers,
    wickets: parseWkts(text(match.displayScore)) ?? toNumber(inn?.wickets),
    score: text(match.displayScore) ?? teamScoreFor(match, home),
  };

  if (!isLive) return { ...fromRow, wickets: fromRow.wickets };

  if (timelineWins && fromTimeline.runs !== null) {
    return {
      ...fromTimeline,
      // A timeline event knows the ball it just bowled, but not the full wicket tally
      // unless the provider put it in the score string.
      wickets: fromTimeline.wickets ?? fromInnings.wickets,
      score: fromTimeline.score ?? `${fromTimeline.runs}`,
    };
  }

  // `currentInnings` and the match row describe the same innings. Whichever is further
  // along in balls is the current one; the other is a stale write.
  if (isFurtherAlong(fromInnings.overs, fromRow.overs) && fromInnings.runs !== null) {
    return { ...fromInnings, score: fromInnings.score ?? `${fromInnings.runs}/${fromInnings.wickets ?? 0}` };
  }
  return { ...fromRow, score: fromRow.score ?? (fromInnings.runs !== null ? `${fromInnings.runs}/${fromInnings.wickets ?? 0}` : null) };
}

function parseRuns(score: string | null): number | null {
  const m = score?.match(/^(\d+)\s*\/\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

function parseWkts(score: string | null): number | null {
  const m = score?.match(/^\d+\s*\/\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

/**
 * The `92/0` for one side, taken from whichever team-score shape the payload uses.
 *
 * `teams` is the newer shape and `teamScores` the older one; the API returns both and
 * fills them at different times.
 */
function teamScoreFor(match: Record<string, unknown>, home: boolean): string | null {
  const teams = (match.teams ?? {}) as Record<string, unknown>;
  const scores = (match.teamScores ?? {}) as Record<string, unknown>;
  const side = (home ? teams.home : teams.away) ?? (home ? scores.home : scores.away);
  if (!side || typeof side !== 'object') return null;
  return text((side as Record<string, unknown>).score);
}

/**
 * Whether the side currently batting is the home side.
 *
 * The innings status can disagree with `currentInnings.battingTeam`, so both are
 * considered before falling back to "the team with the lower total is chasing".
 */
function isHomeBatting(match: Record<string, unknown>): boolean {
  if (typeof match.inningsStatus === 'string') {
    const s = match.inningsStatus.toLowerCase();
    if (s.includes('second_innings_home_team') || s.includes('1st_innings_away_team')) return true;
    if (s.includes('first_innings_home_team') || s.includes('2nd_innings_away_team')) return false;
  }
  const teams = (match.teams ?? {}) as Record<string, unknown>;
  const home = (teams.home ?? {}) as Record<string, unknown>;
  const away = (teams.away ?? {}) as Record<string, unknown>;
  const inn = (match.currentInnings ?? {}) as Record<string, unknown>;

  const batting = String(inn.battingTeam ?? '').trim().toLowerCase();
  if (batting) {
    const homeCode = String(home.code ?? '').trim().toLowerCase();
    const homeName = String(home.name ?? '').trim().toLowerCase();
    if (batting === homeCode || batting === homeName) return true;
    if (homeCode || homeName) return false;
  }
  const homeRuns = toNumber(home.score);
  const awayRuns = toNumber(away.score);
  if (homeRuns !== null && awayRuns !== null) return homeRuns <= awayRuns;
  return true;
}

/**
 * Live-updated state for one match.
 *
 * @param matchId  Subscribe to this match's SSE stream. Omit on list surfaces to track
 *                 every live match at once.
 * @param enabled  Pass `false` to leave the socket idle.
 */
export function useMatchState(
  match: Record<string, unknown> | null | undefined,
  matchId?: string | null,
  enabled = true,
  timeline?: Record<string, unknown> | null,
): MatchState {
  const isLive = String(match?.status ?? '').trim().toLowerCase() === 'live';
  const liveUpdate = useMatchStream(matchId ?? undefined, enabled && isLive);
  const merged = useMemo(
    () => (liveUpdate ? mergeMatchLivePayload(match ?? null, liveUpdate as never) : match),
    [match, liveUpdate],
  );
  return useMemo(() => deriveMatchState(merged, timeline), [merged, timeline]);
}

export { EMPTY_STATE as EMPTY_MATCH_STATE };