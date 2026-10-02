/**
 * Match facts the API already sends but the header never showed: who won the
 * toss and what they chose, the official result, the winning side and margin,
 * and the period-by-period split. Everything here is derived, never invented —
 * a fact with no stored value is omitted rather than guessed.
 */
import { pickMatchSides, describeMatchResult, scoreboardFromMatch } from './matchScoreboard';

export type MatchFact = { label: string; value: string };

function text(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw || raw === '—' || raw === '-' || raw === 'null' || raw === 'undefined') return '';
  return raw;
}

/** Strip the provider prefix so an id can be compared with a code. */
function bare(value: string): string {
  return value.replace(/^sr:(competitor|sport_event|team):/i, '').trim().toLowerCase();
}

function sideCandidates(side: unknown, index: 0 | 1, teamNames: string[]): string[] {
  const rec = (side && typeof side === 'object' ? side : {}) as Record<string, unknown>;
  const out = [rec.id, rec.teamId, rec.code, rec.abbr, rec.shortName, rec.name]
    .map((v) => text(v))
    .filter(Boolean);
  const named = text(teamNames[index]);
  if (named) out.push(named);
  return out.map(bare).filter(Boolean);
}

/**
 * The feed stores the toss winner as a competitor id (`sr:competitor:107203`)
 * but the match object may only carry codes or names, so every identifier a
 * side is known by is compared before giving up.
 */
export function resolveSideById(match: Record<string, unknown>, id: unknown): 'home' | 'away' | null {
  const needle = bare(text(id));
  if (!needle) return null;
  const teams = match.teams;
  const isObj = teams && typeof teams === 'object' && !Array.isArray(teams);
  const teamNames = Array.isArray(match.teamNames) ? (match.teamNames as string[]) : [];
  const home = isObj ? sideCandidates((teams as Record<string, unknown>).home, 0, teamNames) : [];
  const away = isObj ? sideCandidates((teams as Record<string, unknown>).away, 1, teamNames) : [];
  if (!isObj && Array.isArray(teams)) {
    const arr = teams as string[];
    return bare(text(arr[0])) === needle ? 'home' : bare(text(arr[1])) === needle ? 'away' : null;
  }
  if (home.includes(needle)) return 'home';
  if (away.includes(needle)) return 'away';
  return null;
}

const DECISION_WORDS: Record<string, string> = {
  bowl: 'to bowl',
  bat: 'to bat',
  field: 'to field',
  defend: 'to defend',
  chase: 'to chase',
};

/** "Lahore won the toss and chose to bowl" — omitted entirely when unknown. */
export function describeToss(match: Record<string, unknown>): string {
  const wonBy = text(match.tossWonBy);
  if (!wonBy) return '';
  const side = resolveSideById(match, wonBy);
  const { home, away } = pickMatchSides(match);
  const winnerName = side === 'home' ? home.name : side === 'away' ? away.name : '';
  if (!winnerName) return '';
  const decision = DECISION_WORDS[String(match.tossDecision ?? '').trim().toLowerCase()] ?? '';
  return decision
    ? `${winnerName} won the toss and chose ${decision}`
    : `${winnerName} won the toss`;
}

export function tossWinnerName(match: Record<string, unknown>): string {
  const side = resolveSideById(match, match.tossWonBy);
  if (!side) return '';
  const { home, away } = pickMatchSides(match);
  return side === 'home' ? home.name : away.name;
}

function scoreParts(value: unknown): { runs: number; wickets: number | null } | null {
  const match = text(value).match(/(\d+)\s*(?:\/\s*(\d+))?/);
  if (!match) return null;
  return { runs: Number(match[1]), wickets: match[2] === undefined ? null : Number(match[2]) };
}

/**
 * The margin, read out of the result text the feed already sent.
 *
 * It is deliberately never derived from the two scores. Whether a match was won
 * by runs or by wickets depends on which side batted first, and the two final
 * totals cannot tell you that — a chasing side always finishes with more runs
 * than the side it chased, but so does a side that batted first and defended a
 * bigger total. Guessing would put a confident, wrong sentence under the score,
 * so when the feed has no margin we show none. `describeMatchResult` in
 * matchScoreboard.ts makes the same call, for the same reason.
 */
export function describeMargin(match: Record<string, unknown>): string {
  const stored = text(match.matchResult) || text(match.result);
  if (!stored) return '';
  const clause = stored.match(/\b(won by [^.,;]+|beat [^.,;]+|No result|Abandoned)\b/i);
  return clause ? clause[1].trim() : '';
}

/** Period-by-period split, when the feed stored one. */
export function periodScoreRows(match: Record<string, unknown>): MatchFact[] {
  const periods = Array.isArray(match.periodScores) ? (match.periodScores as unknown[]) : [];
  const out: MatchFact[] = [];
  periods.forEach((raw, index) => {
    const rec = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
    const name = text(rec.name) || text(rec.period) || `Period ${index + 1}`;
    const score = text(rec.score) || text(rec.display_score);
    if (name && score) out.push({ label: name, value: score });
  });
  return out;
}

export function isDecided(match: Record<string, unknown>): boolean {
  return ['completed', 'closed', 'ended', 'cancelled', 'canceled', 'abandoned'].includes(
    String(match.status ?? '').toLowerCase(),
  );
}

export function winnerName(match: Record<string, unknown>): string {
  const side = resolveSideById(match, match.winnerId);
  if (!side) return '';
  const { home, away } = pickMatchSides(match);
  return side === 'home' ? home.name : away.name;
}

/**
 * A one-clause clarifier for a wicket margin.
 *
 * "Montreal Tigers won by 7 wickets" sits next to a scorecard reading 140/6, and
 * the reader naturally compares 7 against that 6. They are unrelated: the margin
 * counts the WINNER's wickets in hand, the 6 is the LOSER's wickets down. Naming
 * it as "wickets in hand" answers the question without adding another number to
 * the line — an earlier version appended the chase target, which only introduced
 * a third figure (136, 137) for the reader to reconcile.
 */
export function marginClarifier(result: string): string {
  const match = result.match(/won by (\d+) wickets?/i);
  if (!match) return '';
  const n = Number(match[1]);
  if (!Number.isFinite(n)) return '';
  return `${n} wickets in hand`;
}

/**
 * Everything the info panel should show that is not already on the scoreboard
 * header. Empty rows are dropped so the panel never shows a wall of em dashes.
 */
export function matchFacts(match: Record<string, unknown>): MatchFact[] {
  const out: MatchFact[] = [];
  const toss = describeToss(match);
  if (toss) out.push({ label: 'Toss', value: toss });

  const decided = isDecided(match);
  if (decided) {
    const winner = winnerName(match);
    if (winner) out.push({ label: 'Winner', value: winner });

    const result = describeMatchResult(match);
    if (result) out.push({ label: 'Result', value: result });

    // The result line already reads out the margin ("won by 30 runs"), so there
    // is no separate Margin row here — a second copy of the same sentence reads
    // like a bug. describeMargin stays exported because it is the one place
    // that knows how to pull that clause out of a provider sentence.
  } else {
    const current = text(match.currentInning);
    if (current) out.push({ label: 'Innings', value: current });
    const overs = text(match.displayOvers);
    if (overs) out.push({ label: 'Overs', value: overs });
  }

  out.push(...periodScoreRows(match));
  return out;
}
