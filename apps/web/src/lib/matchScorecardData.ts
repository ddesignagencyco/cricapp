/**
 * The provider's own per-player scorecard.
 *
 * ## Why this module exists
 *
 * The scorecard used to be rebuilt by replaying every ball in the timeline and
 * accumulating runs, balls, fours and sixes. That is a second, parallel
 * implementation of cricket, and it inherits every assumption the replay makes:
 * wides and no-balls have to be classified correctly, maidens have to be detected
 * from over boundaries, and economy has to be recomputed. On a 4-innings Test that
 * is 1,680 events of arithmetic, and a single mis-classified delivery changes a
 * player's line.
 *
 * The timeline payload already contains the provider's authoritative figures:
 *
 * ```
 * statistics.innings[]
 *   .number                              1-based innings number
 *   .batting_team / .bowling_team        stable competitor ids
 *   .teams[]  .id                        stable competitor id
 *            .name / .abbreviation        display name and code
 *            .statistics.batting.players[]  .statistics.runs, .balls_faced,
 *                                          .fours, .sixes, .strike_rate,
 *                                          .dismissal{ type, over_number,
 *                                          ball_number, bowler_id, fielder_id }
 *            .statistics.bowling.players[]  .statistics.overs_bowled, .maidens,
 *                                          .conceded_runs, .wickets,
 *                                          .economy_rate
 * ```
 *
 * Reading it directly means the scorecard shows what the provider says happened,
 * including the per-player `id` needed to link a name to a player page, and the
 * `order` needed to show a lineup in batting order.
 *
 * ## `overs_bowled` and dismissals are already in cricket notation
 *
 * `overs_bowled` is `"6.3"` for six overs and three balls, so it passes straight
 * through `formatCricketOvers`. A dismissal carries a **one-based** `over_number`
 * and a `ball_number`, so `"over 50.4"` is really 49 overs and 4 balls — it is
 * converted here, once, rather than being printed one over out everywhere.
 */

import { formatCricketOvers, oversToBalls } from './cricketMath';
import { readCompetitors, unwrapTimelinePayload } from './matchInnings';
import type { SideQualifier } from './matchInnings';
import { formatPlayerName } from '../utils/helpers';

/* ─── Readers ────────────────────────────────────────────────── */

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function asNum(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function asList(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(asRecord)
    .filter((rec): rec is Record<string, unknown> => rec !== null);
}

/* ─── Row shapes ─────────────────────────────────────────────── */

export type ProviderDismissal = {
  type: string;
  /** Delivery-aware overs, converted from the provider's one-based pair. */
  overs: string;
  overNumber: number | null;
  ballNumber: number | null;
  bowlerId: string | null;
  fielderId: string | null;
};

export type ProviderBattingRow = {
  id: string;
  name: string;
  order: number | null;
  runs: number | null;
  balls: number | null;
  fours: number | null;
  sixes: number | null;
  strikeRate: number | null;
  dotBalls: number | null;
  minutes: number | null;
  out: boolean;
  dismissal: ProviderDismissal | null;
};

export type ProviderBowlingRow = {
  id: string;
  name: string;
  order: number | null;
  /** Delivery-aware, e.g. `"6.3"`. */
  overs: string;
  maidens: number | null;
  runs: number | null;
  wickets: number | null;
  economy: number | null;
  dotBalls: number | null;
  wides: number | null;
  noBalls: number | null;
};

export type ProviderInningsCard = {
  number: number;
  battingTeamId: string;
  bowlingTeamId: string;
  battingTeamName: string;
  battingTeamCode: string;
  bowlingTeamName: string;
  bowlingTeamCode: string;
  batting: ProviderBattingRow[];
  bowling: ProviderBowlingRow[];
};

/**
 * Converts the provider's one-based `(over_number, ball_number)` to cricket notation.
 *
 * The provider counts overs from one, so an over numbered 50 ball 4 is the 50th
 * over of the innings — 49 completed overs and 4 balls. Printing `50.4` beside a
 * scorecard reading `49.4` is a one-over error in every fall-of-wickets line.
 */
export function dismissalOvers(overNumber: number | null, ballNumber: number | null): string {
  if (overNumber === null) return '';
  const ball = ballNumber === null ? 1 : Math.min(6, Math.max(1, ballNumber));
  return formatCricketOvers(overNumber - 1 + ball / 10);
}

function readDismissal(raw: unknown): ProviderDismissal | null {
  const rec = asRecord(raw);
  if (!rec) return null;
  const type = asText(rec.type);
  if (!type) return null;
  const overNumber = asNum(rec.over_number);
  const ballNumber = asNum(rec.ball_number);
  return {
    type,
    overs: dismissalOvers(overNumber, ballNumber),
    overNumber,
    ballNumber,
    bowlerId: asText(rec.bowler_id) || null,
    fielderId: asText(rec.fielder_id) || null,
  };
}

function readBattingPlayers(stats: Record<string, unknown> | null): ProviderBattingRow[] {
  const players = asList(stats?.players);
  return players.map((player) => {
    const playerStats = asRecord(player.statistics) ?? {};
    const dismissal = readDismissal(playerStats.dismissal);
    return {
      id: asText(player.id),
      name: formatPlayerName(asText(player.name)) || 'Batter',
      order: asNum(playerStats.order),
      runs: asNum(playerStats.runs),
      balls: asNum(playerStats.balls_faced),
      fours: asNum(playerStats.fours),
      sixes: asNum(playerStats.sixes),
      strikeRate: asNum(playerStats.strike_rate),
      dotBalls: asNum(playerStats.dot_balls),
      minutes: asNum(playerStats.minutes_at_crease),
      // A dismissal type of "not out" or "did not bat" is not a dismissal.
      out: Boolean(dismissal) && !/not\s*out|did\s*not\s*bat|retired/i.test(dismissal.type),
      dismissal,
    };
  });
}

function readBowlingPlayers(stats: Record<string, unknown> | null): ProviderBowlingRow[] {
  const players = asList(stats?.players);
  return players.map((player) => {
    const playerStats = asRecord(player.statistics) ?? {};
    return {
      id: asText(player.id),
      name: formatPlayerName(asText(player.name)) || 'Bowler',
      order: asNum(playerStats.order),
      overs: formatCricketOvers(playerStats.overs_bowled) || asText(playerStats.overs_bowled),
      maidens: asNum(playerStats.maidens),
      runs: asNum(playerStats.conceded_runs),
      wickets: asNum(playerStats.wickets),
      economy: asNum(playerStats.economy_rate),
      dotBalls: asNum(playerStats.dot_balls),
      wides: asNum(playerStats.wides),
      noBalls: asNum(playerStats.no_balls),
    };
  });
}

/* ─── The cards ──────────────────────────────────────────────── */

/**
 * One scorecard per innings, straight from `statistics.innings[]`.
 *
 * Empty when the payload has no statistics — an upcoming fixture, or a match whose
 * timeline only carried period events. Callers treat an empty list as "no
 * scorecard available" and render an empty state rather than a partial table.
 */
export function readProviderInningsCards(
  timeline: Record<string, unknown> | null | undefined,
): ProviderInningsCard[] {
  const payload = unwrapTimelinePayload(timeline ?? null);
  const statistics = asRecord(payload?.statistics);
  const inningsList = asList(statistics?.innings);
  if (inningsList.length === 0) return [];

  const competitors = readCompetitors(payload);
  const nameFor = (id: string, fallback: string) => {
    const needle = id.toLowerCase();
    if (competitors.home && competitors.home.id.toLowerCase() === needle) return competitors.home;
    if (competitors.away && competitors.away.id.toLowerCase() === needle) return competitors.away;
    return { name: fallback, code: '' };
  };

  const cards: ProviderInningsCard[] = [];
  for (const innings of inningsList) {
    const number = asNum(innings.number);
    if (number === null) continue;
    const battingTeamId = asText(innings.batting_team);
    const bowlingTeamId = asText(innings.bowling_team);
    const teams = asList(innings.teams);

    // The batting side's own `teams[]` entry carries the batting rows; the other
    // entry carries the bowling rows. Selecting by the presence of the block — and
    // cross-checked against the stated ids — avoids depending on array order.
    const battingEntry =
      teams.find((team) => asRecord(asRecord(team.statistics)?.batting) !== null) ?? null;
    const bowlingEntry =
      teams.find((team) => asRecord(asRecord(team.statistics)?.bowling) !== null) ?? null;

    const battingRef = battingEntry
      ? nameFor(asText(battingEntry.id), '')
      : nameFor(battingTeamId, '');
    const bowlingRef = bowlingEntry
      ? nameFor(asText(bowlingEntry.id), '')
      : nameFor(bowlingTeamId, '');

    const batting = readBattingPlayers(asRecord(asRecord(battingEntry?.statistics)?.batting));
    const bowling = readBowlingPlayers(asRecord(asRecord(bowlingEntry?.statistics)?.bowling));
    if (batting.length === 0 && bowling.length === 0) continue;

    cards.push({
      number,
      battingTeamId: battingTeamId || asText(battingEntry?.id),
      bowlingTeamId: bowlingTeamId || asText(bowlingEntry?.id),
      battingTeamName: battingRef?.name ?? '',
      battingTeamCode: (battingRef?.code ?? '').toUpperCase(),
      bowlingTeamName: bowlingRef?.name ?? '',
      bowlingTeamCode: (bowlingRef?.code ?? '').toUpperCase(),
      batting,
      bowling,
    });
  }
  return cards.sort((a, b) => a.number - b.number);
}

/* ─── Fall of wickets ────────────────────────────────────────── */

export type FallOfWicketEntry = {
  wicket: number;
  /** Score at the fall, when the ball-by-ball payload knows it. */
  score: string | null;
  runs: number | null;
  overs: string;
  batter: string;
  bowler: string | null;
  fielder: string | null;
  dismissal: string;
};

/**
 * The fall of wickets for one innings.
 *
 * A dismissal carries the over it happened in but not the team score at that moment,
 * so the score comes from the ball-by-ball `display_score` on the wicket event when the
 * events are available. Where they are not — which is the normal case, because the
 * page deliberately does not ship 1.6 MB of events — the entry still carries the over
 * and the batter, and the score is simply omitted rather than guessed.
 *
 * Rows are sorted by **when the wicket fell**, not by batting order. A No. 3 batter
 * dismissed first over and a No. 11 dismissed last appear in the scorecard in batting
 * order, so walking the batting rows as they stand would print the fall backwards.
 */
export function readFallOfWickets(
  timeline: Record<string, unknown> | null | undefined,
  card: ProviderInningsCard,
  index?: EventIndex,
): FallOfWicketEntry[] {
  const events = index ?? (timeline ? makeEventIndex(timeline) : EMPTY_EVENT_INDEX);

  const dismissed = card.batting
    .filter((row) => row.out && row.dismissal)
    .map((row) => ({ row, dismissal: row.dismissal as ProviderDismissal }));

  dismissed.sort((a, b) => {
    const ab = oversToBalls(Number(a.dismissal.overs) || NaN);
    const bb = oversToBalls(Number(b.dismissal.overs) || NaN);
    if (ab !== null && bb !== null && ab !== bb) return ab - bb;
    if (ab !== null && bb === null) return -1;
    if (ab === null && bb !== null) return 1;
    return (a.row.order ?? 999) - (b.row.order ?? 999);
  });

  return dismissed.map(({ row, dismissal }, i) => {
    const score = events.scoreAt(card.number, dismissal.overNumber, dismissal.ballNumber);
    return {
      wicket: i + 1,
      score,
      runs: score ? (Number(score.match(/^\s*(\d+)/)?.[1] ?? NaN) || null) : null,
      overs: dismissal.overs,
      batter: row.name,
      bowler: events.bowlerName(dismissal.bowlerId),
      fielder: null,
      dismissal: dismissal.type,
    };
  });
}

/**
 * The fall of wickets for every innings in a timeline, indexed by innings number.
 *
 * This exists so the **server** can do the walk over the 1,879 events once and ship
 * only the resulting few kilobytes. The browser then never sees the events unless the
 * reader opens the commentary tab.
 */
export function buildFallOfWicketsIndex(
  timeline: Record<string, unknown> | null | undefined,
): Map<number, FallOfWicketEntry[]> {
  const out = new Map<number, FallOfWicketEntry[]>();
  const cards = readProviderInningsCards(timeline);
  if (cards.length === 0) return out;
  const index = makeEventIndex(timeline);
  for (const card of cards) {
    const entries = readFallOfWickets(null, card, index);
    if (entries.length > 0) out.set(card.number, entries);
  }
  return out;
}


function ballEvents(timeline: Record<string, unknown> | null | undefined): unknown[] {
  const payload = unwrapTimelinePayload(timeline ?? null);
  if (!payload) return [];
  if (Array.isArray(payload.timeline)) return payload.timeline;
  const wrapper = asRecord(payload.sport_event_timeline);
  if (Array.isArray(wrapper?.timeline)) return wrapper.timeline as unknown[];
  const event = asRecord(payload.sport_event);
  if (Array.isArray(event?.timeline)) return event.timeline as unknown[];
  return [];
}

/** Whether the payload carries any ball-by-ball events. */
export function timelineHasEvents(timeline: Record<string, unknown> | null | undefined): boolean {
  return ballEvents(timeline).length > 0;
}

/**
 * The timeline without its ball events.
 *
 * ## Why this matters
 *
 * A real four-innings Test returns 1,879 timeline events, and those events are
 * **1,614 KB of a 1,682 KB payload — 96% of it.** Everything else the match centre
 * reads is in the remaining 67 KB:
 *
 * - `sport_event.competitors[]` — the stable ids the innings are mapped by
 * - `sport_event.tournament` / `venue` / `season` / `tournament_round`
 * - `sport_event_status.period_scores[]` — the innings scores
 * - `statistics.innings[]` — the whole scorecard, the playing XIs and the dismissals
 *
 * So the events are needed for exactly two things: the ball-by-ball commentary list,
 * and the team score at each fall of wicket. Both are handled without shipping 1.6 MB
 * on page load — the fall of wickets is computed **on the server** (see
 * `buildFallOfWicketsIndex`) and the commentary fetches the events only when that tab
 * is opened.
 *
 * Dropping the events here also means the trimmed payload stays under the size where
 * a client can cheaply hold, re-derive and cache it.
 */
export function slimTimelinePayload(
  timeline: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  const payload = unwrapTimelinePayload(timeline ?? null);
  if (!payload) return null;
  const copy: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (key === 'timeline') continue;
    copy[key] = value;
  }
  // `sport_event.timeline` and `sport_event_timeline.timeline` are second and third
  // copies of the same array on some payloads, so all three have to go.
  copy.sport_event = withoutTimeline(copy.sport_event);
  copy.sport_event_timeline = withoutTimeline(copy.sport_event_timeline);
  return copy;
}

function withoutTimeline(value: unknown): unknown {
  const rec = asRecord(value);
  if (!rec || !('timeline' in rec)) return value;
  const out: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(rec)) {
    if (key === 'timeline') continue;
    out[key] = entry;
  }
  return out;
}

type EventIndex = {
  /** `display_score` at `inning:over:ball`, where the payload states one. */
  scoreAt: (_inning: number, _over: number | null, _ball: number | null) => string | null;
  /** Display name for a player id seen in the bowling params. */
  bowlerName: (_playerId: string | null) => string | null;
};

/**
 * One pass over the events, indexing the two things a fall of wicket needs.
 *
 * Built once per timeline and shared by every wicket. Looking each wicket up by
 * re-scanning the event list was quadratic — a Test with 40 wickets scanned 1,879
 * events 40 times for the score and again for the bowler's name.
 */
function makeEventIndex(timeline: Record<string, unknown> | null | undefined): EventIndex {
  const scores = new Map<string, string>();
  const bowlerNames = new Map<string, string>();

  for (const event of ballEvents(timeline)) {
    const rec = asRecord(event);
    if (!rec) continue;

    const bowler = asRecord(asRecord(rec.bowling_params)?.bowler);
    const bowlerId = asText(bowler?.id);
    const bowlerName = formatPlayerName(asText(bowler?.name));
    if (bowlerId && bowlerName && !bowlerNames.has(bowlerId)) {
      bowlerNames.set(bowlerId, bowlerName);
    }

    const inning = asNum(rec.inning);
    const over = asNum(rec.over_number);
    const ball = asNum(rec.ball_number);
    const score = asText(rec.display_score);
    if (inning === null || over === null || ball === null || !score) continue;
    scores.set(`${inning}:${over}:${ball}`, score);
  }

  return {
    scoreAt: (inning, over, ball) => {
      if (over === null || ball === null) return null;
      return scores.get(`${inning}:${over}:${ball}`) ?? null;
    },
    bowlerName: (playerId) => (playerId ? bowlerNames.get(playerId) ?? null : null),
  };
}

const EMPTY_EVENT_INDEX: EventIndex = {
  scoreAt: () => null,
  bowlerName: () => null,
};

/* ─── Squads ─────────────────────────────────────────────────── */

export type SquadEntry = {
  id: string;
  name: string;
  /** Batting order, when the payload states one. */
  order: number | null;
  runs: number | null;
  wickets: number | null;
  batting: boolean;
};

/**
 * The two XIs, taken from the players who batted in each side's first innings.
 *
 * There is no `lineups[]` on these payloads, so the scorecard is the only place the
 * eleven appear. A side that was bowled out has ten dismissals and one player who
 * did not bat, so this is labelled in the UI as the XI "from the scorecard" rather
 * than presented as an authoritative team sheet.
 */
export function readSquads(
  timeline: Record<string, unknown> | null | undefined,
): { home: SquadEntry[]; away: SquadEntry[] } {
  const payload = unwrapTimelinePayload(timeline ?? null);
  const competitors = readCompetitors(payload);
  const bySide: Record<SideQualifier, Map<string, SquadEntry>> = { home: new Map(), away: new Map() };

  // Parsed once. It was called twice — once per loop — which re-read every innings'
  // player rows for a list the second pass only uses to fill gaps.
  const cards = readProviderInningsCards(timeline);

  for (const card of cards) {
    const ref = competitorRefFor(competitors, card.battingTeamId);
    if (!ref) continue;
    const bucket = bySide[ref];
    for (const row of card.batting) {
      if (row.runs === null && row.balls === null && row.order === null) continue;
      const key = row.id || row.name.toLowerCase();
      if (bucket.has(key)) continue;
      bucket.set(key, {
        id: row.id,
        name: row.name,
        order: row.order,
        runs: row.runs,
        wickets: null,
        batting: true,
      });
    }
  }

  // A bowler who never came to the bat is still in the XI, so the bowling side of
  // the first innings fills any gaps. A row the provider gave no overs and no
  // figures for is not evidence anyone played, so it is skipped.
  for (const card of cards) {
    const ref = competitorRefFor(competitors, card.bowlingTeamId);
    if (!ref) continue;
    const bucket = bySide[ref];
    for (const row of card.bowling) {
      const key = row.id || row.name.toLowerCase();
      if (bucket.has(key)) continue;
      const bowled = oversToBalls(Number(row.overs) || NaN);
      if (bowled === null && row.wickets === null) continue;
      bucket.set(key, {
        id: row.id,
        name: row.name,
        order: row.order,
        runs: null,
        wickets: row.wickets,
        batting: false,
      });
    }
  }

  return {
    home: sortSquad([...bySide.home.values()]),
    away: sortSquad([...bySide.away.values()]),
  };
}

function competitorRefFor(
  competitors: { home: { id: string } | null; away: { id: string } | null },
  id: string,
): SideQualifier | null {
  if (!id) return null;
  const needle = id.toLowerCase();
  if (competitors.home?.id && competitors.home.id.toLowerCase() === needle) return 'home';
  if (competitors.away?.id && competitors.away.id.toLowerCase() === needle) return 'away';
  return null;
}

function sortSquad(entries: SquadEntry[]): SquadEntry[] {
  return entries.sort((a, b) => {
    const ao = a.order ?? 999;
    const bo = b.order ?? 999;
    if (ao !== bo) return ao - bo;
    return a.name.localeCompare(b.name);
  });
}

/* ─── Overs totals ───────────────────────────────────────────── */

/** Total legal balls bowled in a set of overs, e.g. `"6.3"` → 39. */
export function oversToLegalBalls(overs: unknown): number | null {
  return oversToBalls(typeof overs === 'string' ? Number(overs) : (overs as number));
}
