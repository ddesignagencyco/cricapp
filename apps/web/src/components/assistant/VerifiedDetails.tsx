import { useState } from 'react';
import type { AssistantAskResponse } from '../../services/assistant';

/**
 * The trust layer under an answer: the exact figures the API read out of the
 * database, plus the raw payload for anyone who wants to check it.
 *
 * Deliberately generic. Earlier versions hard-coded a handful of field names, so
 * any answer shape they did not know about rendered nothing and the reader had
 * no way to see what the number came from.
 */

/** Fields we know how to name well. Anything else falls back to its raw key. */
const FACT_LABELS: Record<string, string> = {
  seasonId: 'Season id',
  seasonName: 'Season',
  matchId: 'Match',
  runId: 'Run',
  latestRunId: 'Latest run',
  previousRunId: 'Previous run',
  modelVersion: 'Model',
  stage: 'Stage',
  createdAt: 'Recorded',
  previousCreatedAt: 'Recorded',
  latestCreatedAt: 'Recorded',
  teamAName: 'Team A',
  teamBName: 'Team B',
  teamAWins: 'A wins',
  teamBWins: 'B wins',
  draws: 'No results',
  totalMeetings: 'Meetings',
  upcomingCount: 'Upcoming',
  homeWinProb: 'Home win',
  awayWinProb: 'Away win',
  latestHomeWinProb: 'Latest home win',
  latestAwayWinProb: 'Latest away win',
  previousHomeWinProb: 'Previous home win',
  previousAwayWinProb: 'Previous away win',
  homeWinProbDelta: 'Home shift',
  awayWinProbDelta: 'Away shift',
  confidence: 'Confidence',
  calibrationBand: 'Band',
  latestOver: 'Over',
  previousOver: 'Over',
  latestReasons: 'Latest factors',
  previousReasons: 'Previous factors',
  playerId: 'Player id',
  playerName: 'Player',
  opponents: 'Opponents',
  dataSource: 'Source',
  totals: 'Totals',
  points: 'Points',
  rank: 'Rank',
  netRunRate: 'NRR',
  netRunRateToCutoff: 'NRR vs cutoff',
  nrrGapToCutoff: 'NRR gap',
  pointsGapToCutoff: 'Points gap',
  playoffSpots: 'Playoff spots',
  playoffCutoffPoints: 'Cutoff points',
  playoffCutoffRank: 'Cutoff rank',
  playoffCutoffNetRunRate: 'Cutoff NRR',
  pointsPerWin: 'Points per win',
  standings: 'Table',
  focusTeam: 'Focus team',
  comparisons: 'Stat rows',
  recentMatches: 'Matches',
  leaderStats: 'Leader stats',
  seasons: 'Seasons',
  scope: 'Scope',
  data: 'Data',
};

type Fact = { key: string; label: string; value: string };

function humanizeKey(key: string): string {
  const spaced = key.replace(/[_-]+/g, ' ').trim();
  if (!spaced) return key;
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** `prob`/`chance` fields arrive as 0–1 fractions and must read as percentages. */
function isProbabilityKey(key: string): boolean {
  return /prob|chance|share/i.test(key);
}

function formatNumber(key: string, value: number): string {
  if (isProbabilityKey(key) && value >= 0 && value <= 1) return `${Math.round(value * 100)}%`;
  if (Number.isInteger(value)) return String(value);
  // Rates and averages need a fixed width or the column jitters as values change.
  if (/rate|average|economy|nrr|netRunRate/i.test(key)) return value.toFixed(3);
  return value.toFixed(2);
}

/** One-line summary for arrays and nested objects, which do not fit in a cell. */
function summarizeContainer(key: string, value: unknown): string | null {
  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    const first = value[0];
    if (typeof first === 'string' || typeof first === 'number') {
      const head = value.slice(0, 3).map(String).join(', ');
      return `${value.length} · ${head}${value.length > 3 ? '…' : ''}`;
    }
    return `${value.length} row${value.length === 1 ? '' : 's'}`;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const name =
      pickString(record, ['teamName', 'name', 'playerName', 'fullName']) ??
      pickNestedRankLine(record);
    if (name) return name;
    return `${Object.keys(record).length} fields`;
  }

  return null;
}

function pickString(record: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

/** e.g. `focusTeam` has no name field worth showing; "3rd · 8 pts · NRR 0.312" does. */
function pickNestedRankLine(record: Record<string, unknown>): string | null {
  const rank = record.rank;
  const points = record.points;
  if (typeof rank !== 'number' && typeof points !== 'number') return null;
  const parts: string[] = [];
  if (typeof rank === 'number') parts.push(`#${rank}`);
  if (typeof points === 'number') parts.push(`${points} pts`);
  if (typeof record.netRunRate === 'number') parts.push(`NRR ${formatNumber('netRunRate', record.netRunRate)}`);
  return parts.length ? parts.join(' · ') : null;
}

function buildFacts(verified: Record<string, unknown>): Fact[] {
  const facts: Fact[] = [];

  for (const [key, value] of Object.entries(verified)) {
    if (value === null || value === undefined) continue;

    if (typeof value === 'number') {
      if (!Number.isFinite(value)) continue;
      facts.push({ key, label: FACT_LABELS[key] ?? humanizeKey(key), value: formatNumber(key, value) });
      continue;
    }

    if (typeof value === 'boolean') {
      facts.push({ key, label: FACT_LABELS[key] ?? humanizeKey(key), value: value ? 'Yes' : 'No' });
      continue;
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) continue;
      facts.push({ key, label: FACT_LABELS[key] ?? humanizeKey(key), value: trimmed });
      continue;
    }

    const summary = summarizeContainer(key, value);
    if (summary) facts.push({ key, label: FACT_LABELS[key] ?? humanizeKey(key), value: summary });
  }

  return facts;
}

/**
 * Opaque identifiers are provenance, not insight: `sr:match:41234` tells a
 * reader nothing about the answer. They stay available in the raw payload view
 * so nothing is hidden, they just do not earn a tile in the grid.
 */
function isOpaqueId(fact: Fact): boolean {
  return /Id$/.test(fact.key) || /^sr:/.test(fact.value);
}

export default function VerifiedDetails({ reply }: { reply: AssistantAskResponse }) {
  const [open, setOpen] = useState(false);
  const [rawOpen, setRawOpen] = useState(false);
  const verified = reply.verified || {};

  const facts = buildFacts(verified).filter((fact) => !isOpaqueId(fact));
  const hasRaw = Object.keys(verified).length > 0;

  if (!facts.length && !hasRaw) return null;

  return (
    <div className="mt-1.5 border-t border-lborder pt-1.5">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="text-[11px] font-bold uppercase tracking-wider text-stext transition-colors hover:text-accent"
      >
        {open ? 'Hide verified figures' : `Verified figures${facts.length ? ` (${facts.length})` : ''}`}
      </button>

      {open ? (
        <div className="mt-2 space-y-2">
          {facts.length ? (
            <dl className="grid grid-cols-2 gap-1.5">
              {facts.map((fact) => (
                <div key={fact.key} className="min-w-0 rounded-md bg-secondary px-2 py-1.5 ring-1 ring-lborder">
                  <dt className="truncate text-[10px] font-bold uppercase tracking-wider text-stext">{fact.label}</dt>
                  <dd className="mt-0.5 break-words font-mono text-xs font-bold tabular-nums text-mtext">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="text-[11px] leading-relaxed text-stext">
              This answer is a statement about what is missing, so there are no stored figures to show.
            </p>
          )}

          {hasRaw ? (
            <div>
              <button
                type="button"
                onClick={() => setRawOpen((value) => !value)}
                aria-expanded={rawOpen}
                className="text-[11px] font-semibold text-stext transition-colors hover:text-accent"
              >
                {rawOpen ? 'Hide raw verified payload' : 'Raw verified payload'}
              </button>
              {rawOpen ? (
                <pre className="native-scrollbar mt-1.5 max-h-40 overflow-auto rounded-md bg-secondary p-2 text-[10px] leading-relaxed text-stext ring-1 ring-lborder">
                  {JSON.stringify(verified, null, 2)}
                </pre>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}