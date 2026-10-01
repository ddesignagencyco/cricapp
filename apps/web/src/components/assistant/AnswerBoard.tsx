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
  top_bowling_average: 'Bowling average',
  top_maidens: 'Maidens',
  top_dot_balls: 'Dot balls',
  top_catches: 'Catches',
  top_strike_rate: 'Strike rate',
  top_fifties: 'Fifties',
  top_hundreds: 'Hundreds',
};

/**
 * Rate and average stats arrive as floats. Printing them raw means a board where
 * one row reads "7.5" and the next "7.85", which looks like a bug. Two decimals
 * is the convention the rest of the site uses for these figures.
 */
const DECIMAL_STATS = new Set([
  'top_average',
  'best_average',
  'best_economy',
  'best_strike_rate',
  'top_bowling_average',
  'top_strike_rate',
]);

function formatStat(stat: string, value: number | null): string {
  if (value === null) return '—';
  if (DECIMAL_STATS.has(stat)) return value.toFixed(2);
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2);
}

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

/** Shared "nothing stored" line, so an empty board never looks like a render bug. */
function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="text-[11px] leading-relaxed text-stext">{children}</p>;
}

function CompareBoard({ verified }: { verified: Record<string, unknown> }) {
  const a = asRecord(verified.playerA);
  const b = asRecord(verified.playerB);
  const nameA = displayName(asText(a?.name) || 'Player A');
  const nameB = displayName(asText(b?.name) || 'Player B');
  const rows = Array.isArray(verified.comparisons) ? verified.comparisons : [];
  const season = asText(verified.seasonName);

  if (rows.length === 0) {
    return <EmptyNote>No shared PSL leader stat categories are stored for these two this season.</EmptyNote>;
  }

  return (
    <div>
      {season ? <p className="text-[11px] font-semibold text-stext">{season}</p> : null}
      <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <p className="text-sm font-black leading-snug text-mtext">{nameA}</p>
        <p className="pb-0.5 text-[10px] font-bold uppercase tracking-wider text-stext">vs</p>
        <p className="text-right text-sm font-black leading-snug text-mtext">{nameB}</p>
      </div>
      <ul className="mt-3 divide-y divide-lborder">
        {rows.map((item, index) => {
          const row = asRecord(item);
          if (!row) return null;
          const stat = asText(row.stat) || 'stat';
          const category = asText(row.category) || '';
          const aVal = asNum(row.playerAValue);
          const bVal = asNum(row.playerBValue);
          const leader = row.leader;
          // Rank is one key that can repeat across categories, so the category
          // and the index both go into the key.
          const key = `${category}-${stat}-${index}`;
          return (
            <li key={key} className="py-2">
              <p className="text-[11px] font-semibold text-stext">
                {category ? `${category} · ` : ''}
                {STAT_LABELS[stat] ?? stat.replace(/_/g, ' ')}
              </p>
              <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-baseline gap-2 font-mono text-sm font-bold tabular-nums">
                <p className={leader === 'a' ? 'text-accent' : 'text-mtext'}>{formatStat(stat, aVal)}</p>
                <p className="text-[10px] text-stext">–</p>
                <p className={`text-right ${leader === 'b' ? 'text-accent' : 'text-mtext'}`}>
                  {formatStat(stat, bVal)}
                </p>
              </div>
              <p className="mt-0.5 text-[10px] text-stext">
                {rankNote(row.rankA, row.rankB, leader)}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Ranks are stored per player, so "A #3 vs B #7" is the useful context. */
function rankNote(rankA: unknown, rankB: unknown, leader: unknown): string {
  const a = asNum(rankA);
  const b = asNum(rankB);
  if (a === null && b === null) return '';
  const parts: string[] = [];
  if (a !== null) parts.push(`#${a}`);
  if (b !== null) parts.push(`#${b}`);
  const suffix = leader === 'a' || leader === 'b' ? ' · edge to the higher figure' : leader === 'tie' ? ' · tied' : '';
  return `${parts.join(' vs ')}${suffix}`;
}

function H2HBoard({ verified }: { verified: Record<string, unknown> }) {
  const nameA = asText(verified.teamAName) || 'Team A';
  const nameB = asText(verified.teamBName) || 'Team B';
  const aWins = asNum(verified.teamAWins) ?? 0;
  const bWins = asNum(verified.teamBWins) ?? 0;
  const draws = asNum(verified.draws) ?? 0;
  const total = asNum(verified.totalMeetings) ?? aWins + bWins + draws;
  // Draws are part of the record but split no wins, so the bar divides by
  // decided matches rather than by total meetings — otherwise the two segments
  // stop adding up to the width of the bar.
  const decided = aWins + bWins;
  const aShare = decided > 0 ? Math.round((aWins / decided) * 100) : 50;
  const meetings = Array.isArray(verified.recentMeetings) ? verified.recentMeetings.slice(0, 4) : [];

  if (total === 0) {
    return <EmptyNote>No completed meetings are stored for this pair yet.</EmptyNote>;
  }

  return (
    <div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
        <p className="text-sm font-black leading-snug">{nameA}</p>
        <p className="font-mono text-lg font-black tabular-nums text-accent">
          {aWins}–{bWins}
        </p>
        <p className="text-right text-sm font-black leading-snug">{nameB}</p>
      </div>
      {decided > 0 ? (
        <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-elevated">
          <span className="bg-accent" style={{ width: `${aShare}%` }} />
          <span className="bg-mtext/25" style={{ width: `${100 - aShare}%` }} />
        </div>
      ) : null}
      <p className="mt-2 text-[11px] text-stext">
        {total} completed
        {draws ? ` · ${draws} no-result` : ''}
        {asNum(verified.upcomingCount) ? ` · ${asNum(verified.upcomingCount)} upcoming` : ''}
      </p>
      {meetings.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {meetings.map((item, index) => {
            const row = asRecord(item);
            if (!row) return null;
            const when = asText(row.scheduled);
            const key = asText(row.matchId) || `${when}-${index}`;
            const score = asText(row.displayScore);
            const result = asText(row.resultText);
            return (
              <li key={key} className="text-[11px] leading-relaxed text-stext">
                <span className="font-semibold text-mtext">{score || result || 'Result stored'}</span>
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
      <p className="mt-1 text-2xl font-black tabular-nums text-mtext">
        {cutoff ?? '—'} <span className="text-sm font-bold text-stext">pts cutoff</span>
      </p>
      <p className="text-[11px] text-stext">Top {spots} playoff places from stored table</p>

      {focus ? (
        <div className="mt-3 rounded-md bg-elevated px-3 py-2 ring-1 ring-lborder">
          <p className="text-sm font-black text-mtext">{asText(focus.teamName) ?? 'Focus team'}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-stext">
            {[
              rankText(focus.rank),
              pointsText(focus.points),
              nrrText(focus.netRunRate),
              playOffText(focus),
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p className="mt-1 text-[11px] leading-relaxed text-stext">
            {remainingText(asNum(focus.remainingFixtures), asNum(focus.maxPossiblePoints))}
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
              <li
                key={asText(row.teamId) || asText(row.teamName)}
                className="flex items-center justify-between gap-2 text-[11px]"
              >
                <span className="min-w-0 truncate font-semibold text-mtext">
                  <span className="mr-1.5 font-mono text-stext">{rank ?? '—'}</span>
                  {asText(row.teamAbbr) || asText(row.teamName)}
                </span>
                <span className="shrink-0 font-mono tabular-nums text-stext">
                  {asNum(row.points) ?? '—'} pts
                  {row.netRunRate !== undefined ? ` · ${nrrText(row.netRunRate)}` : ''}
                </span>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

function rankText(rank: unknown): string | null {
  const value = asNum(rank);
  return value === null ? null : `Rank ${value}`;
}

function pointsText(points: unknown): string | null {
  const value = asNum(points);
  return value === null ? null : `${value} pts`;
}

/**
 * NRR is stored as a float. Three decimals is the cricket convention and matches
 * the points table; two would round 0.3149 to 0.31 and change the ordering.
 */
function nrrText(nrr: unknown): string | null {
  const value = asNum(nrr);
  return value === null ? null : `NRR ${value.toFixed(3)}`;
}

function playOffText(focus: Record<string, unknown>): string | null {
  if (focus.inPlayoffPosition === true) return 'inside the top four';
  if (focus.mathematicallyAlive === true) return 'still alive';
  return 'out on points';
}

function remainingText(remaining: number | null, maxPossible: number | null): string {
  if (remaining === null) return '';
  if (remaining === 0) {
    return maxPossible !== null ? `No fixtures left — ${maxPossible} pts is the ceiling.` : 'No fixtures left.';
  }
  return `${remaining} fixture${remaining === 1 ? '' : 's'} left${
    maxPossible !== null ? `, up to ${maxPossible} pts` : ''
  }.`;
}

function FormBoard({ verified }: { verified: Record<string, unknown> }) {
  const name = displayName(asText(verified.playerName) || 'Player');
  const totals = asRecord(verified.totals);
  const rows = Array.isArray(verified.recentMatches) ? verified.recentMatches : [];
  const leaders = Array.isArray(verified.leaderStats) ? verified.leaderStats : [];
  const dataSource = asText(verified.dataSource);

  if (!rows.length && !leaders.length) {
    return <EmptyNote>No per-match scorecard rows are stored for {name} yet.</EmptyNote>;
  }

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-black text-mtext">{name}</p>
        {dataSource ? <p className="text-[10px] font-bold uppercase tracking-wider text-stext">{dataSource}</p> : null}
      </div>

      {totals ? (
        <p className="mt-1 text-[11px] text-stext">
          {[
            `${asNum(totals.matchesWithData) ?? 0} stored ${(asNum(totals.matchesWithData) ?? 0) === 1 ? 'match' : 'matches'}`,
            `${asNum(totals.runs) ?? 0} runs`,
            asNum(totals.wickets) ? `${asNum(totals.wickets)} wkts` : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      ) : null}

      {rows.length > 0 ? (
        <ul className="mt-3 divide-y divide-lborder">
          {rows.map((item, index) => {
            const row = asRecord(item);
            if (!row) return null;
            const bat = asRecord(row.batting);
            const bowl = asRecord(row.bowling);
            const runs = asNum(bat?.runs);
            const balls = asNum(bat?.balls);
            const wickets = asNum(bowl?.wickets);
            const opponent = asText(row.opponentLabel);
            const scheduled = asText(row.scheduled);
            return (
              <li key={asText(row.matchId) || `${scheduled}-${index}`} className="py-2">
                <p className="text-[11px] font-semibold text-mtext">
                  {opponent ? `vs ${opponent}` : asText(row.tournament) || 'Match'}
                </p>
                <p className="mt-0.5 font-mono text-xs tabular-nums text-stext">
                  {/* `*` marks not out; without it a 40 and a 40* look identical. */}
                  {runs !== null ? `${runs}${bat?.notOut ? '*' : ''}${balls !== null ? ` (${balls}b)` : ''}` : '—'}
                  {wickets !== null ? ` · ${wickets} wkts` : ''}
                </p>
              </li>
            );
          })}
        </ul>
      ) : null}

      {leaders.length > 0 ? (
        <ul className="mt-3 space-y-1">
          {leaders.map((item, index) => {
            const row = asRecord(item);
            if (!row) return null;
            const stat = asText(row.stat) || 'stat';
            const category = asText(row.category) || '';
            const rank = asNum(row.rank);
            return (
              <li
                key={`${category}-${stat}-${index}`}
                className="flex items-center justify-between gap-2 text-[11px]"
              >
                <span className="min-w-0 truncate text-stext">
                  {category ? `${category} · ` : ''}
                  {STAT_LABELS[stat] ?? stat.replace(/_/g, ' ')}
                </span>
                <span className="shrink-0 font-mono font-bold tabular-nums text-mtext">
                  {formatStat(stat, asNum(row.value))}{' '}
                  <span className="font-semibold text-stext">{rank !== null ? `#${rank}` : ''}</span>
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
  const previousHome = asNum(verified.previousHomeWinProb);
  const previousAway = asNum(verified.previousAwayWinProb);
  const homePct = home !== null ? Math.round(home * 100) : null;
  const awayPct = away !== null ? Math.round(away * 100) : null;
  const delta = asNum(verified.homeWinProbDelta);
  const over = asNum(verified.latestOver);
  const band = asText(verified.calibrationBand);
  const stage = asText(verified.stage);
  const reasons = Array.isArray(verified.latestReasons) ? verified.latestReasons.map(String).slice(0, 4) : [];

  if (homePct === null && awayPct === null) {
    return <EmptyNote>No win-probability run is stored for this match yet.</EmptyNote>;
  }

  // The split must total 100, otherwise the two bars leave a visible gap or
  // overflow the track. Any remainder goes to the away side, which is also what
  // the model itself does.
  const total = (homePct ?? 0) + (awayPct ?? 0);
  const homeWidth = total > 0 ? Math.round(((homePct ?? 0) / total) * 100) : 50;

  return (
    <div>
      {stage ? (
        <p className="text-[10px] font-bold uppercase tracking-wider text-stext">
          {stage.replace(/_/g, '-')} model run
        </p>
      ) : null}
      <div className="mt-1 grid grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-stext">Home</p>
          <p className="font-mono text-2xl font-black tabular-nums text-accent">{homePct !== null ? `${homePct}%` : '—'}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-stext">Away</p>
          <p className="font-mono text-2xl font-black tabular-nums text-mtext">
            {awayPct !== null ? `${awayPct}%` : '—'}
          </p>
        </div>
      </div>

      {total > 0 ? (
        <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-elevated">
          <span className="bg-accent" style={{ width: `${homeWidth}%` }} />
          <span className="bg-mtext/20" style={{ width: `${100 - homeWidth}%` }} />
        </div>
      ) : null}

      {delta !== null ? (
        <p className="mt-2 text-[11px] font-semibold text-stext">
          Home moved {delta >= 0 ? '+' : ''}
          {Math.round(delta * 100)} pts
          {over !== null ? ` · over ${over}` : ''}
          {previousHome !== null && previousAway !== null
            ? ` · was ${Math.round(previousHome * 100)}/${Math.round(previousAway * 100)}`
            : ''}
        </p>
      ) : null}

      {band ? <p className="mt-1 text-[11px] text-stext">Calibration band {band}</p> : null}

      {reasons.length > 0 ? (
        <ul className="mt-2 space-y-0.5">
          {reasons.map((reason, index) => (
            <li key={`${reason}-${index}`} className="text-[11px] leading-relaxed text-stext">
              {reason}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default function AnswerBoard({ reply }: { reply: AssistantAskResponse }) {
  const verified = reply.verified || {};
  const hasCompare = Array.isArray(verified.comparisons) && verified.comparisons.length > 0;
  const hasH2H =
    Boolean(asText(verified.teamAName)) &&
    Boolean(asText(verified.teamBName)) &&
    (asNum(verified.totalMeetings) ?? 0) > 0;
  const hasQual = asNum(verified.playoffCutoffPoints) !== null || Boolean(asRecord(verified.focusTeam));
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