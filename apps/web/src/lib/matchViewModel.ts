/**
 * The match centre's single source of truth.
 *
 * Every panel on `/matches/[id]` — the scoreboard, the overview, the comparison,
 * the scorecard, the match info, the sidebar cards — reads this object and nothing
 * else. That is the fix for the page previously showing two different scores in
 * two different sections: there was no shared value to disagree about, because each
 * panel re-derived the score from whichever field it happened to know about.
 *
 * ## What it guarantees
 *
 * - **One score per surface.** A team's headline number is the *latest innings that
 *   team batted*, read from the innings list. The scorecard, the comparison bars and
 *   the match info all read that same list, so they cannot print different numbers.
 * - **Home and away are never reversed.** Sides come from the provider's `home` /
 *   `away` qualifiers; nothing is sorted, swapped or inferred from a name.
 * - **A completed match has no batting side.** `battingSide` is null once the match
 *   is over, so no card can describe a "live" state for a finished game.
 * - **Overs are delivery-aware.** Every overs figure comes from the provider's
 *   `display_overs`; a completed-over value is never substituted.
 * - **Multi-innings formats work.** A Test keeps all four innings, and each is
 *   labelled with the side that actually batted it, resolved by stable competitor id.
 */

import { deriveMatchState } from '../hooks/useMatchState';
import { oversToBalls, requiredRunRate } from './cricketMath';
import {
  buildMatchInnings,
  latestInningsFor,
  readCompetitors,
  readOversLimit,
  readPeriodScores,
  readToss,
  unwrapTimelinePayload,
  type MatchInnings,
  type SideQualifier,
} from './matchInnings';
import { getInitials } from '../utils/helpers';

/** The match states the page renders differently. */
export type MatchPhase = 'upcoming' | 'live' | 'innings-break' | 'completed' | 'abandoned';

export type MatchViewSide = {
  /** Stable provider competitor id, when the payload carries one. */
  id: string | null;
  name: string;
  code: string;
  qualifier: SideQualifier;
};

export type MatchViewModel = {
  matchId: string;
  /** The API's own `status`. */
  status: string;
  phase: MatchPhase;
  statusLabel: string;
  isLive: boolean;
  isUpcoming: boolean;
  isCompleted: boolean;
  /** Completed or called off. The match has no further state. */
  isOver: boolean;

  home: MatchViewSide;
  away: MatchViewSide;
  /** All innings, in order. The only place a score comes from. */
  innings: MatchInnings[];
  /** The innings each side last batted — the scoreboard's headline. */
  headline: { home: MatchInnings | null; away: MatchInnings | null };
  /** The innings in progress. Null unless the match is live. */
  currentInnings: MatchInnings | null;
  /** Which side is batting. Null when the match is over. */
  battingSide: SideQualifier | null;

  format: string | null;
  formatLabel: string;
  oversLimit: number | null;
  multiInnings: boolean;

  tournament: string | null;
  tournamentId: string | null;
  seasonName: string | null;
  matchNumber: number | null;

  venue: string | null;
  venueCity: string | null;
  venueCountry: string | null;
  timeZone: string | null;
  scheduled: string | null;

  result: string | null;
  winnerId: string | null;
  winnerSide: SideQualifier | null;
  winnerName: string | null;
  tossText: string;

  /** Live chase only. Null when there is nothing to chase. */
  target: number | null;
  requiredRunRate: number | null;
  ballsRemaining: number | null;
  runsRemaining: number | null;

  /** The one-line status strip under the scoreboard. */
  situation: string;
  /** The provider's own status text, kept for Match Info. */
  statusReason: string | null;
};

/* ─── Readers ────────────────────────────────────────────────── */

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value).trim();
}

function num(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Provider ids arrive in a couple of shapes; compare them all on a bare form. */
function bareId(value: unknown): string {
  return text(value)
    .replace(/^sr:(competitor|team|sport_event):/i, '')
    .trim()
    .toLowerCase();
}

const FORMAT_LABELS: Record<string, string> = {
  test: 'Test',
  first_class: 'First-class',
  firstclass: 'First-class',
  fc: 'First-class',
  odi: 'ODI',
  one_day: 'ODI',
  list_a: 'List A',
  t20: 'T20',
  t20i: 'T20I',
  t10: 'T10',
  sixes: 'The Hundred',
  multi: 'Multi-sport',
};

function formatLabel(raw: string | null): string {
  const value = text(raw).toLowerCase().replace(/[\s-]+/g, '_');
  if (!value) return '';
  if (FORMAT_LABELS[value]) return FORMAT_LABELS[value];
  return value
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const DECISION_WORDS: Record<string, string> = {
  bat: 'to bat',
  batting: 'to bat',
  bowl: 'to bowl',
  bowling: 'to bowl',
  field: 'to field',
  fielding: 'to field',
};

const STORED_RESULT_NOISE = /^(ended|completed|finished|match ended|result|closed)$/i;

function meaningfulResult(value: unknown): string | null {
  const raw = text(value);
  if (!raw || raw === '—' || raw === '-' || STORED_RESULT_NOISE.test(raw)) return null;
  return raw;
}

/* ─── Sides ──────────────────────────────────────────────────── */

/**
 * Home and away, by the provider's own qualifier.
 *
 * The match row's `teams` object has no ids, so when the timeline is available its
 * `sport_event.competitors[]` supplies the stable ids and the authoritative
 * home/away ordering. Without a timeline the row's ordering is used, which is the
 * same order the API wrote.
 */
function readSides(
  match: Record<string, unknown>,
  payload: Record<string, unknown> | null,
): { home: MatchViewSide; away: MatchViewSide } {
  const competitors = readCompetitors(payload);
  const teams = asRecord(match.teams);
  const teamNames = Array.isArray(match.teamNames) ? (match.teamNames as string[]) : [];
  const arrayTeams = Array.isArray(match.teams) ? (match.teams as string[]) : null;

  const rowSide = (qualifier: SideQualifier, _index: 0 | 1): Record<string, unknown> => {
    const rec = asRecord(teams?.[qualifier]);
    if (rec) return rec;
    return {};
  };

  const build = (qualifier: SideQualifier, index: 0 | 1): MatchViewSide => {
    const provider = qualifier === 'home' ? competitors.home : competitors.away;
    const rec = rowSide(qualifier, index);
    // An upcoming fixture has `teams` as a plain abbreviation array with no scores,
    // so the array entry is both a name and a code in that shape.
    const arrayEntry = text(arrayTeams?.[index]);
    const name =
      text(rec.name) || text(provider?.name) || text(teamNames[index]) || arrayEntry;
    const code = text(rec.code) || text(provider?.code) || (arrayEntry && arrayEntry.length <= 5 ? arrayEntry : '');
    // A provider id is only ever taken from the timeline, which is the one place
    // the API states it. The match row's fields are codes and names.
    const id = text(provider?.id) || text(rec.teamId) || text(rec.id) || null;
    const safeCode =
      code && code.length <= 5 && !/^sr:/i.test(code)
        ? code.toUpperCase()
        : getInitials(name) || (qualifier === 'home' ? 'HOM' : 'AWY');
    return {
      id: id || null,
      name: name || (qualifier === 'home' ? 'Home team' : 'Away team'),
      code: safeCode,
      qualifier,
    };
  };

  return { home: build('home', 0), away: build('away', 1) };
}

/* ─── Status ─────────────────────────────────────────────────── */

/**
 * The state the page renders for, which is not the same as the API's `status`.
 *
 * The API's four values cannot express an innings break — the match is `live`
 * throughout, with the last innings closed and the next one about to start. The
 * timeline says so explicitly (`period_start` with `period_name: "Innings break"`),
 * so that is what is read.
 */
function readPhase(
  match: Record<string, unknown>,
  payload: Record<string, unknown> | null,
  innings: MatchInnings[],
  oversLimit: number | null,
): MatchPhase {
  const status = text(match.status).toLowerCase();
  if (status === 'cancelled' || status === 'canceled') return 'abandoned';
  if (status === 'completed') return 'completed';
  if (status === 'upcoming' || status === 'scheduled' || status === 'postponed') {
    return status === 'upcoming' ? 'upcoming' : 'abandoned';
  }
  if (status !== 'live') return 'completed';

  // Live. An innings break is when the last innings is closed but the match is not.
  const last = innings[innings.length - 1];
  if (last && inningsClosed(last, oversLimit) && hasExplicitInningsBreak(payload)) {
    return 'innings-break';
  }
  return 'live';
}

/** An innings is closed when it is all out or has used its allocation. */
function inningsClosed(innings: MatchInnings, oversLimit: number | null): boolean {
  if ((innings.wickets ?? 0) >= 10) return true;
  if (oversLimit === null || oversLimit <= 0) return false;
  const balls = oversToBalls(innings.overs ?? NaN);
  if (balls === null) return false;
  return balls >= oversLimit * 6;
}

function hasExplicitInningsBreak(payload: Record<string, unknown> | null): boolean {
  if (!payload) return false;
  const events = timelineEventList(payload);
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const rec = asRecord(events[i]);
    if (!rec) continue;
    const type = text(rec.type).toLowerCase();
    if (type === 'match_ended' || type === 'match_started') return false;
    if (type !== 'period_start') continue;
    return /break/i.test(text(rec.period_name));
  }
  return false;
}

export function timelineEventList(payload: Record<string, unknown> | null): unknown[] {
  if (!payload) return [];
  if (Array.isArray(payload.timeline)) return payload.timeline;
  const wrapper = asRecord(payload.sport_event_timeline);
  if (Array.isArray(wrapper?.timeline)) return wrapper.timeline as unknown[];
  const event = asRecord(payload.sport_event);
  if (Array.isArray(event?.timeline)) return event.timeline as unknown[];
  return [];
}

/* ─── The result line ────────────────────────────────────────── */

/**
 * A result derived from the innings list, used only when the API stored none.
 *
 * Limited-overs cricket has an unambiguous reading: the side that batted second
 * either reached the target (won by the wickets in hand) or was bowled out short
 * (won by the runs in hand). First-class cricket is not derived at all — reading a
 * draw or a win out of four innings totals requires knowing the follow-on and the
 * order of dismissal, and guessing it would put a confident wrong sentence under
 * the score.
 */
function deriveResultFromInnings(
  innings: MatchInnings[],
  oversLimit: number | null,
  firstInnings: MatchInnings | null,
  currentInnings: MatchInnings | null,
  phase: MatchPhase,
  sideName: (_side: SideQualifier | null) => string,
): string | null {
  if (phase !== 'completed') return null;
  if (!firstInnings) return null;
  const firstRuns = firstInnings.runs;
  if (firstRuns === null) return null;

  if (oversLimit === null || oversLimit <= 0) return null; // first-class: not derived

  if (!currentInnings) return null;
  const secondRuns = currentInnings.runs;
  if (secondRuns === null) return null;

  const chasing = sideName(currentInnings.side);
  const defending = sideName(firstInnings.side);
  if (!chasing || !defending) return null;

  if (secondRuns > firstRuns) {
    const wicketsInHand = 10 - (currentInnings.wickets ?? 10);
    return `${chasing} won by ${wicketsInHand} wicket${wicketsInHand === 1 ? '' : 's'}`;
  }
  if (secondRuns === firstRuns) return 'Match tied';
  const byRuns = firstRuns - secondRuns;
  return `${defending} won by ${byRuns} run${byRuns === 1 ? '' : 's'}`;
}

/* ─── The view model ─────────────────────────────────────────── */

export type BuildMatchViewModelInput = {
  match: Record<string, unknown> | null | undefined;
  timeline?: Record<string, unknown> | null;
};

export function buildMatchViewModel({
  match,
  timeline,
}: BuildMatchViewModelInput): MatchViewModel {
  const row = (match ?? {}) as Record<string, unknown>;
  const payload = unwrapTimelinePayload(timeline ?? null);
  const event = asRecord(payload?.sport_event) ?? null;
  const statusBlock = asRecord(payload?.sport_event_status) ?? null;

  const status = text(row.status).toLowerCase();
  const isLive = status === 'live';
  const isUpcoming = status === 'upcoming' || status === 'scheduled';
  const isCompleted = status === 'completed';
  const isCancelled = status === 'cancelled' || status === 'canceled' || status === 'postponed';
  const isOver = isCompleted || isCancelled;

  const { home, away } = readSides(row, payload);
  const byId = new Map<string, MatchViewSide>();
  if (home.id) byId.set(bareId(home.id), home);
  if (away.id) byId.set(bareId(away.id), away);

  const oversLimit = readOversLimit(payload);
  const innings = buildMatchInnings({ match: row, timeline: payload, isLive });
  const phase = readPhase(row, payload, innings, oversLimit);

  const headline = {
    home: latestInningsFor(innings, 'home'),
    away: latestInningsFor(innings, 'away'),
  };

  // A finished match has no innings in progress, so it has no batting side. This is
  // the guard that stops a completed Test printing "Australia batting" under a
  // result banner.
  const battingSide: SideQualifier | null = isOver ? null : currentBattingSide(innings);

  const currentInnings = battingSide
    ? latestInningsFor(innings, battingSide)
    : isLive
      ? (innings[innings.length - 1] ?? null)
      : null;

  const eventRecord = event ?? {};
  const venueRec = asRecord(eventRecord.venue);
  const tournamentRec = asRecord(eventRecord.tournament);
  const seasonRec = asRecord(eventRecord.season);
  const roundRec = asRecord(eventRecord.tournament_round);
  const conditionsRec = asRecord(eventRecord.sport_event_conditions);

  const format =
    text(tournamentRec?.type) || text(conditionsRec?.type) || text(row.format) || null;

  const lookup = sideNameLookup(home, away);
  const winnerId = text(row.winnerId ?? statusBlock?.winner_id) || null;
  const winnerSide = winnerId ? (byId.get(bareId(winnerId))?.qualifier ?? null) : null;
  const winnerName = winnerSide ? lookup(winnerSide) : '';

  const toss = readToss(row, payload);
  const tossWonById = text(row.tossWonBy ?? statusBlock?.toss_won_by) || null;
  const tossSide = tossWonById ? (byId.get(bareId(tossWonById))?.qualifier ?? toss.side) : toss.side;
  const tossDecision = text(row.tossDecision ?? statusBlock?.toss_decision).toLowerCase();
  const tossText = describeToss(tossSide, tossDecision, sideNameFor(lookup, tossSide));

  const periods = readPeriodScores(row, payload);
  const firstInnings = innings[0] ?? null;

  const chase = resolveChase(innings, oversLimit, battingSide);

  const storedResult = meaningfulResult(row.result) ?? meaningfulResult(statusBlock?.match_result_text);
  const result =
    storedResult ??
    deriveResultFromInnings(
      innings,
      oversLimit,
      firstInnings,
      phase === 'live' || phase === 'innings-break'
        ? (currentInnings ?? null)
        : (innings[innings.length - 1] ?? null),
      phase,
      lookup,
    );

  const view: MatchViewModel = {
    matchId: text(row.matchId ?? row.id),
    status,
    phase,
    statusLabel: statusLabelFor(phase, status, row),
    isLive,
    isUpcoming,
    isCompleted,
    isOver,

    home,
    away,
    innings,
    headline,
    currentInnings: isOver ? null : currentInnings,
    battingSide,

    format,
    formatLabel: formatLabel(format),
    oversLimit,
    multiInnings: oversLimit === null || oversLimit <= 0 || innings.length > 2,

    tournament: text(row.tournament ?? tournamentRec?.name) || null,
    tournamentId: text(tournamentRec?.id) || null,
    seasonName: text(seasonRec?.name) || null,
    matchNumber: num(roundRec?.competition_sport_event_number) ?? num(row.matchNumber),

    venue: text(row.venue ?? venueRec?.name) || null,
    venueCity: text(venueRec?.city_name) || null,
    venueCountry: text(venueRec?.country_name) || null,
    timeZone: text(venueRec?.timezone) || null,
    scheduled: text(row.scheduled ?? eventRecord.scheduled) || null,

    result,
    winnerId,
    winnerSide,
    winnerName,
    tossText,

    target: chase ? chase.target : null,
    requiredRunRate: chase ? chase.requiredRunRate : null,
    ballsRemaining: chase ? chase.ballsRemaining : null,
    runsRemaining: chase ? chase.runsRemaining : null,

    situation: '',
    statusReason: meaningfulResult(row.matchStatus) ?? (isCancelled ? text(row.matchStatus) || 'Cancelled' : null),
  };

  view.situation = describeSituation(view, periods.length);
  return view;
}

function sideNameLookup(home: MatchViewSide, away: MatchViewSide) {
  return (side: SideQualifier) => (side === 'home' ? home.name : away.name);
}

function sideNameFor(lookup: (_side: SideQualifier) => string, side: SideQualifier | null): string {
  if (!side) return '';
  return lookup(side);
}

function statusLabelFor(phase: MatchPhase, status: string, match: Record<string, unknown>): string {
  switch (phase) {
    case 'live':
      return 'Live';
    case 'innings-break':
      return 'Innings break';
    case 'upcoming':
      return 'Upcoming';
    case 'abandoned':
      return 'Cancelled';
    case 'completed':
    default:
      return text(match.matchStatus) || (status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Completed');
  }
}

/** The batting side, from the last innings the payload identifies. */
function currentBattingSide(innings: MatchInnings[]): SideQualifier | null {
  for (let i = innings.length - 1; i >= 0; i -= 1) {
    if (innings[i].side) return innings[i].side;
  }
  return null;
}

function describeToss(side: SideQualifier | null, decision: string, name: string): string {
  if (!side || !name) return '';
  const word = DECISION_WORDS[decision] ?? (decision ? `to ${decision}` : '');
  return word ? `${name} won the toss and chose ${word}` : `${name} won the toss`;
}

/**
 * The chase, for a live second innings.
 *
 * The target is the first innings' runs plus one. A Test's second innings is not a
 * chase — it is the same side batting again — so a multi-innings match never gets a
 * target, which is why this only reads the first two innings.
 */
function resolveChase(
  innings: MatchInnings[],
  oversLimit: number | null,
  battingSide: SideQualifier | null,
): {
  target: number;
  requiredRunRate: number | null;
  ballsRemaining: number | null;
  runsRemaining: number | null;
} | null {
  if (innings.length !== 2) return null;
  const [first, second] = innings;
  if (!battingSide || first.side === second.side) return null;
  if (first.runs === null || second.runs === null) return null;
  const target = first.runs + 1;
  const runsRemaining = target - second.runs;
  if (runsRemaining < 0) return null;

  let ballsRemaining: number | null = null;
  if (oversLimit !== null && oversLimit > 0) {
    const bowled = oversToBalls(second.overs ?? NaN);
    if (bowled !== null) ballsRemaining = Math.max(0, oversLimit * 6 - bowled);
  }
  return {
    target,
    requiredRunRate: ballsRemaining ? requiredRunRate(runsRemaining, ballsRemaining) : null,
    ballsRemaining,
    runsRemaining,
  };
}

/** The one-line situation under the scoreboard, per state. */
function describeSituation(view: MatchViewModel, periodCount: number): string {
  if (view.phase === 'abandoned') {
    const reason = view.statusReason ? ` (${view.statusReason})` : '';
    return `This match was called off${reason}.`;
  }
  if (view.phase === 'upcoming') {
    return view.venue
      ? `${view.home.name} vs ${view.away.name} — yet to start.`
      : `${view.home.name} vs ${view.away.name} — yet to start.`;
  }
  if (view.phase === 'completed') {
    return view.result ?? 'Match completed. No official result recorded.';
  }
  if (view.phase === 'innings-break') {
    const inningsNo = view.innings.length;
    return `Innings break before innings ${inningsNo + 1}.`;
  }
  // Live.
  const current = view.currentInnings;
  if (view.target !== null && view.runsRemaining !== null) {
    const balls = view.ballsRemaining;
    const overText =
      balls === null
        ? ''
        : ` with ${Math.floor(balls / 6)}.${balls % 6 === 0 ? '' : balls % 6} overs left`;
    return `Chasing ${view.target}. Needs ${view.runsRemaining} more run${view.runsRemaining === 1 ? '' : 's'}${overText}.`;
  }
  if (current && current.runs !== null) {
    const overs = current.oversLabel ? ` from ${current.oversLabel} overs` : '';
    return `${current.side === 'home' ? view.home.name : view.away.name} are ${current.runs}/${current.wickets ?? 0}${overs}.`;
  }
  return periodCount > 0 ? 'Match in progress.' : 'Match in progress.';
}

/* ─── Live overlay ───────────────────────────────────────────── */

/**
 * The live score, reconciled by `deriveMatchState`.
 *
 * `deriveMatchState` is the site's existing single reconciliation rule — it picks
 * the source (match row vs timeline) that is further along in BALLS and then reads
 * every field from it. The match centre reuses it rather than writing a second
 * copy, because a second copy of the same rule is exactly how the header and the
 * commentary drifted apart before.
 *
 * Returns null for anything that is not live, so a completed match can never
 * acquire a live block from a stale `currentInnings`.
 */
export function liveInningsOverlay(
  match: Record<string, unknown> | null | undefined,
  timeline: Record<string, unknown> | null | undefined,
): { runs: number; wickets: number | null; overs: string; runRate: number | null } | null {
  if (!match) return null;
  if (text(match.status).toLowerCase() !== 'live') return null;
  const state = deriveMatchState(match, timeline ?? null);
  if (state.runs === null) return null;
  return {
    runs: state.runs,
    wickets: state.wickets,
    overs: state.oversLabel,
    runRate: state.runRate,
  };
}
