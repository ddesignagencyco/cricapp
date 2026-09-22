import type { ReactNode } from 'react';
import type { AssistantAskResponse, AssistantIntent } from '../../services/assistant';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function asText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asNum(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function displayName(name: string): string {
  if (!name.includes(',')) return name;
  const [last, first] = name.split(',').map((part) => part.trim());
  return first && last ? `${first} ${last}` : name;
}

function intentLabel(intent: AssistantIntent): string {
  switch (intent) {
    case 'team_head_to_head':
      return 'Head to head';
    case 'player_compare':
      return 'Player compare';
    case 'player_recent_form':
      return 'Recent form';
    case 'standings_qualification':
      return 'Qualification';
    case 'match_prediction_summary':
      return 'Win probability';
    case 'live_win_prob_explain':
      return 'Probability shift';
    case 'unknown':
      return 'Stored stats';
    default: {
      const _never: never = intent;
      return _never;
    }
  }
}

const STAT_LABELS: Record<string, string> = {
  highest_score: 'Highest score',
  top_average: 'Average',
  top_fours: 'Fours',
  top_sixes: 'Sixes',
  top_runs: 'Runs',
  top_wickets: 'Wickets',
  best_economy: 'Economy',
  best_average: 'Bowling average',
  best_strike_rate: 'Strike rate',
};

function Shell({
  intent,
  children,
}: {
  intent: AssistantIntent;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl bg-secondary ring-1 ring-lborder">
      <p className="border-b border-lborder px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-stext">
        {intentLabel(intent)}
      </p>
      <div className="px-3 py-3">{children}</div>
    </div>
  );
}

function CompareBoard({ verified }: { verified: Record<string, unknown> }) {
  const a = asRecord(verified.playerA);
  const b = asRecord(verified.playerB);
  const nameA = displayName(asText(a?.name) || 'Player A');
  const nameB = displayName(asText(b?.name) || 'Player B');
  const rows = Array.isArray(verified.comparisons) ? verified.comparisons : [];
  const season = asText(verified.seasonName);

  return (
    <div>
      {season ? <p className="text-[11px] font-semibold text-stext">{season}</p> : null}
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <p className="text-sm font-black leading-snug text-mtext">{nameA}</p>
        <p className="pb-0.5 text-[10px] font-bold uppercase tracking-wider text-stext">vs</p>
        <p className="text-right text-sm font-black leading-snug text-mtext">{nameB}</p>
      </div>
      <ul className="mt-3 divide-y divide-lborder">
        {rows.map((item) => {
          const row = asRecord(item);
          if (!row) return null;
          const stat = asText(row.stat) || 'stat';
          const aVal = asNum(row.playerAValue);
          const bVal = asNum(row.playerBValue);
          const leader = row.leader;
          return (
            <li key={`${row.category}-${stat}`} className="py-2">
              <p className="text-[11px] font-semibold text-stext">
                {STAT_LABELS[stat] ?? stat.replace(/_/g, ' ')}
              </p>
              <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-baseline gap-2 font-mono text-sm font-bold tabular-nums">
                <p className={leader === 'a' ? 'text-accent' : 'text-mtext'}>{aVal ?? '—'}</p>
                <p className="text-[10px] text-stext">–</p>
                <p className={`text-right ${leader === 'b' ? 'text-accent' : 'text-mtext'}`}>{bVal ?? '—'}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function H2HBoard({ verified }: { verified: Record<string, unknown> }) {
  const nameA = asText(verified.teamAName) || 'Team A';
  const nameB = asText(verified.teamBName) || 'Team B';
  const aWins = asNum(verified.teamAWins) ?? 0;
  const bWins = asNum(verified.teamBWins) ?? 0;
  const draws = asNum(verified.draws) ?? 0;
  const total = asNum(verified.totalMeetings) ?? aWins + bWins;
  const aShare = total > 0 ? Math.round((aWins / Math.max(total, 1)) * 100) : 50;
  const meetings = Array.isArray(verified.recentMeetings) ? verified.recentMeetings.slice(0, 4) : [];

  return (
    <div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <p className="text-sm font-black leading-snug">{nameA}</p>
        <p className="font-mono text-lg font-black tabular-nums text-accent">
          {aWins}–{bWins}
        </p>
        <p className="text-right text-sm font-black leading-snug">{nameB}</p>
      </div>
      <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-elevated">
        <span className="bg-accent" style={{ width: `${aShare}%` }} />
        <span className="bg-mtext/25" style={{ width: `${100 - aShare}%` }} />
      </div>
      <p className="mt-2 text-[11px] text-stext">
        {total} completed
        {draws ? ` · ${draws} no-result` : ''}
        {asNum(verified.upcomingCount) ? ` · ${asNum(verified.upcomingCount)} upcoming` : ''}
      </p>
      {meetings.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {meetings.map((item) => {
            const row = asRecord(item);
            if (!row) return null;
            const when = asText(row.scheduled);
            return (
              <li key={asText(row.matchId) || `${when}-${asText(row.resultText)}`} className="text-[11px] text-stext">
                <span className="font-semibold text-mtext">{asText(row.displayScore) || asText(row.resultText) || 'Result stored'}</span>
                {when ? ` · ${when.slice(0, 10)}` : ''}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function QualificationBoard({ verified }: { verified: Record<string, unknown> }) {
  const focus = asRecord(verified.focusTeam);
  const cutoff = asNum(verified.playoffCutoffPoints);
  const spots = asNum(verified.playoffSpots) ?? 4;
  const season = asText(verified.seasonName);
  const standings = Array.isArray(verified.standings) ? verified.standings.slice(0, 6) : [];

  return (
    <div>
      {season ? <p className="text-[11px] font-semibold text-stext">{season}</p> : null}
      <p className="mt-1 text-2xl font-black tabular-nums text-mtext">{cutoff ?? '—'} <span className="text-sm font-bold text-stext">pts cutoff</span></p>
      <p className="text-[11px] text-stext">Top {spots} playoff places from stored table</p>
      {focus ? (
        <div className="mt-3 rounded-md bg-elevated px-3 py-2 ring-1 ring-lborder">
          <p className="text-sm font-black text-mtext">{asText(focus.teamName)}</p>
          <p className="mt-0.5 text-[11px] text-stext">
            Rank {asNum(focus.rank)} · {asNum(focus.points)} pts · NRR {asNum(focus.netRunRate)?.toFixed(3) ?? '—'}
            {focus.inPlayoffPosition ? ' · inside' : focus.mathematicallyAlive ? ' · still alive' : ' · out on points'}
          </p>
        </div>
      ) : null}
      {standings.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {standings.map((item) => {
            const row = asRecord(item);
            if (!row) return null;
            const rank = asNum(row.rank);
            return (
              <li key={asText(row.teamId) || asText(row.teamName)} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="min-w-0 truncate font-semibold text-mtext">
                  <span className="mr-1.5 font-mono text-stext">{rank}</span>
                  {asText(row.teamAbbr) || asText(row.teamName)}
                </span>
                <span className="shrink-0 font-mono tabular-nums text-stext">{asNum(row.points)} pts</span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function FormBoard({ verified }: { verified: Record<string, unknown> }) {
  const name = displayName(asText(verified.playerName) || 'Player');
  const totals = asRecord(verified.totals);
  const rows = Array.isArray(verified.recentMatches) ? verified.recentMatches : [];
  const leaders = Array.isArray(verified.leaderStats) ? verified.leaderStats : [];

  return (
    <div>
      <p className="text-sm font-black text-mtext">{name}</p>
      {totals ? (
        <p className="mt-1 text-[11px] text-stext">
          {asNum(totals.matchesWithData) ?? 0} stored matches · {asNum(totals.runs) ?? 0} runs
          {asNum(totals.wickets) ? ` · ${asNum(totals.wickets)} wkts` : ''}
        </p>
      ) : null}
      {rows.length > 0 ? (
        <ul className="mt-3 divide-y divide-lborder">
          {rows.map((item) => {
            const row = asRecord(item);
            if (!row) return null;
            const bat = asRecord(row.batting);
            const bowl = asRecord(row.bowling);
            const runs = asNum(bat?.runs);
            return (
              <li key={asText(row.matchId) || asText(row.scheduled)} className="py-2">
                <p className="text-[11px] font-semibold text-mtext">
                  {asText(row.opponentLabel) ? `vs ${asText(row.opponentLabel)}` : asText(row.tournament) || 'Match'}
                </p>
                <p className="mt-0.5 font-mono text-xs tabular-nums text-stext">
                  {runs !== null ? `${runs}${bat?.notOut ? '*' : ''}${asNum(bat?.balls) !== null ? ` (${asNum(bat?.balls)}b)` : ''}` : '—'}
                  {asNum(bowl?.wickets) !== null ? ` · ${asNum(bowl?.wickets)} wkts` : ''}
                </p>
              </li>
            );
          })}
        </ul>
      ) : null}
      {leaders.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {leaders.map((item) => {
            const row = asRecord(item);
            if (!row) return null;
            const stat = asText(row.stat) || 'stat';
            return (
              <li key={`${row.category}-${stat}`} className="flex justify-between gap-2 text-[11px]">
                <span className="text-stext">{STAT_LABELS[stat] ?? stat.replace(/_/g, ' ')}</span>
                <span className="font-mono font-bold tabular-nums text-mtext">
                  {asNum(row.value)} <span className="font-semibold text-stext">#{asNum(row.rank)}</span>
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function PredictionBoard({ verified }: { verified: Record<string, unknown> }) {
  const home = asNum(verified.homeWinProb) ?? asNum(verified.latestHomeWinProb);
  const away = asNum(verified.awayWinProb) ?? asNum(verified.latestAwayWinProb);
  const homePct = home !== null ? Math.round(home * 100) : null;
  const awayPct = away !== null ? Math.round(away * 100) : null;
  const delta = asNum(verified.homeWinProbDelta);
  const reasons = Array.isArray(verified.latestReasons) ? verified.latestReasons.map(String).slice(0, 4) : [];

  return (
    <div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-stext">Home</p>
          <p className="font-mono text-2xl font-black tabular-nums text-accent">{homePct !== null ? `${homePct}%` : '—'}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stext">Away</p>
          <p className="font-mono text-2xl font-black tabular-nums text-mtext">{awayPct !== null ? `${awayPct}%` : '—'}</p>
        </div>
      </div>
      {homePct !== null && awayPct !== null ? (
        <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-elevated">
          <span className="bg-accent" style={{ width: `${homePct}%` }} />
          <span className="bg-mtext/20" style={{ width: `${awayPct}%` }} />
        </div>
      ) : null}
      {delta !== null ? (
        <p className="mt-2 text-[11px] font-semibold text-stext">
          Home moved {delta >= 0 ? '+' : ''}
          {Math.round(delta * 100)} pts
          {asNum(verified.latestOver) !== null ? ` · over ${asNum(verified.latestOver)}` : ''}
        </p>
      ) : null}
      {asText(verified.calibrationBand) ? (
        <p className="mt-1 text-[11px] text-stext">Band {asText(verified.calibrationBand)}</p>
      ) : null}
      {reasons.length > 0 ? (
        <p className="mt-2 text-[11px] leading-relaxed text-stext">{reasons.join(' · ')}</p>
      ) : null}
    </div>
  );
}

export default function AnswerBoard({ reply }: { reply: AssistantAskResponse }) {
  const verified = reply.verified || {};
  const hasCompare = Array.isArray(verified.comparisons) && verified.comparisons.length > 0;
  const hasH2H = asText(verified.teamAName) && asText(verified.teamBName) && asNum(verified.totalMeetings) !== null;
  const hasQual = asNum(verified.playoffCutoffPoints) !== null || asRecord(verified.focusTeam);
  const hasForm =
    (Array.isArray(verified.recentMatches) && verified.recentMatches.length > 0) ||
    (Array.isArray(verified.leaderStats) && verified.leaderStats.length > 0);
  const hasPred =
    asNum(verified.homeWinProb) !== null ||
    asNum(verified.latestHomeWinProb) !== null ||
    asNum(verified.homeWinProbDelta) !== null;

  let board: ReactNode = null;
  switch (reply.intent) {
    case 'player_compare':
      board = hasCompare ? <CompareBoard verified={verified} /> : null;
      break;
    case 'team_head_to_head':
      board = hasH2H ? <H2HBoard verified={verified} /> : null;
      break;
    case 'standings_qualification':
      board = hasQual ? <QualificationBoard verified={verified} /> : null;
      break;
    case 'player_recent_form':
      board = hasForm ? <FormBoard verified={verified} /> : null;
      break;
    case 'match_prediction_summary':
    case 'live_win_prob_explain':
      board = hasPred ? <PredictionBoard verified={verified} /> : null;
      break;
    case 'unknown':
      board = null;
      break;
    default: {
      const _never: never = reply.intent;
      return _never;
    }
  }

  if (!board) return null;
  return <Shell intent={reply.intent}>{board}</Shell>;
}
