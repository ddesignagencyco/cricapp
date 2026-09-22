import EmptyState from '../EmptyState';
import { currentRunRate, formatRate } from '../../lib/cricketMath';
import BallTracker from '../BallTracker';
import { extractBalls } from '../MatchTimeline';
import { extractInningsScorecards, extractSquads } from '../../lib/matchCentreData';
import { RelatedNewsPanel } from './RelatedNewsPanel';
import type {
  BattingRow,
  BowlingRow,
  FallOfWicket,
  LiveBatsman,
  LiveBowler,
  NewsArticle,
} from '../../types';

function asList(value: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object');
}

function hasValue(value: unknown): boolean {
  return value !== null && value !== undefined;
}

function playerName(item: Record<string, unknown>): string {
  return String(item.name || item.playerName || item.fullName || '').trim();
}

export function sidePlayers(side: unknown): string[] {
  if (!side || typeof side !== 'object') return [];
  const rec = side as Record<string, unknown>;
  const raw = rec.players || rec.lineup || rec.squad || rec.xi;
  return asList(raw)
    .map(playerName)
    .filter(Boolean);
}

export function LiveStrip({ match }: { match: Record<string, unknown> }) {
  const batsmen = Array.isArray(match.batsmen) ? (match.batsmen as LiveBatsman[]) : [];
  const bowler = match.bowler && typeof match.bowler === 'object' ? (match.bowler as LiveBowler) : null;
  const pair = match.partnership && typeof match.partnership === 'object'
    ? (match.partnership as { runs?: number; balls?: number })
    : null;
  const innings = match.currentInnings as { runRate?: number; runs?: number; overs?: number } | undefined;
  const crrRaw = Number(match.currentRunRate ?? innings?.runRate);
  const crrComputed = currentRunRate(Number(innings?.runs) || 0, Number(innings?.overs) || 0);
  const crr = Number.isFinite(crrRaw) && crrRaw > 0 ? crrRaw : crrComputed;
  const rrr = match.requiredRunRate;
  const recent = Array.isArray(match.recentBalls) ? match.recentBalls.map(String) : [];
  if (!batsmen.length && !bowler && !pair && !hasValue(crr) && !hasValue(rrr) && recent.length === 0) return null;

  return (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {batsmen.length > 0 && (
        <div className="rounded-xl bg-card p-3 ring-1 ring-lborder">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stext">Batters</p>
          <ul className="space-y-1 text-sm text-mtext">
            {batsmen.slice(0, 2).map((row) => (
              <li key={row.name} className="flex justify-between gap-2">
                <span className="truncate">{row.name}{row.status === 'striker' ? ' *' : ''}</span>
                <span className="font-mono">{row.runs} ({row.balls})</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {bowler && (
        <div className="rounded-xl bg-card p-3 ring-1 ring-lborder">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stext">Bowler</p>
          <p className="text-sm text-mtext">
            {bowler.name} · {bowler.wickets}/{bowler.runs} ({bowler.overs} ov)
          </p>
        </div>
      )}
      {pair && hasValue(pair.runs) && (
        <div className="rounded-xl bg-card p-3 ring-1 ring-lborder">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stext">Partnership</p>
          <p className="font-mono text-sm font-bold text-mtext">{pair.runs}{hasValue(pair.balls) ? ` (${pair.balls}b)` : ''}</p>
        </div>
      )}
      {(hasValue(crr) || hasValue(rrr)) && (
        <div className="rounded-xl bg-card p-3 ring-1 ring-lborder">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stext">Rates</p>
          <p className="text-sm text-mtext">
            {hasValue(crr) ? `CRR ${formatRate(Number(crr))}` : ''}
            {hasValue(crr) && hasValue(rrr) ? ' · ' : ''}
            {hasValue(rrr) ? `RRR ${rrr}` : ''}
          </p>
        </div>
      )}
      {recent.length > 0 && (
        <div className="sm:col-span-2">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stext">Recent balls</p>
          <BallTracker balls={recent} />
        </div>
      )}
    </div>
  );
}

function cell(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function ScoreTable({
  title,
  team,
  headers,
  rows,
}: {
  title: string;
  team: string;
  headers: string[];
  rows: string[][];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-2xl bg-card ring-1 ring-lborder">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-lborder px-4 py-3">
        <p className="text-sm font-bold text-mtext">{title}</p>
        <p className="text-xs font-semibold uppercase tracking-wider text-stext">{team}</p>
      </div>
      <table className="w-full min-w-[560px] table-fixed text-sm">
        <colgroup>
          <col className="w-[40%]" />
          {headers.slice(1).map((header) => (
            <col key={header} className="w-[12%]" />
          ))}
        </colgroup>
        <thead>
          <tr className="border-b border-lborder bg-secondary/50 text-xs font-semibold uppercase tracking-wider text-stext">
            {headers.map((header, index) => (
              <th
                key={header}
                scope="col"
                className={`px-3 py-2.5 ${index === 0 ? 'pl-4 text-left' : 'text-right'} ${index === headers.length - 1 ? 'pr-4' : ''}`}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cols, rowIndex) => (
            <tr key={`${cols[0]}-${rowIndex}`} className="border-b border-lborder/60 last:border-0">
              {cols.map((col, index) => (
                <td
                  key={`${rowIndex}-${index}`}
                  className={`px-3 py-2.5 ${index === 0 ? 'pl-4 text-left text-mtext' : 'text-right font-mono tabular-nums text-mtext'} ${index === cols.length - 1 ? 'pr-4' : ''}`}
                >
                  {col}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ScorecardPanel({
  match,
  timeline,
}: {
  match: Record<string, unknown>;
  timeline?: Record<string, unknown> | null;
}) {
  const innings = extractInningsScorecards(match, timeline || null);
  const batting = Array.isArray(match.battingScorecard) ? (match.battingScorecard as BattingRow[]) : [];
  const bowling = Array.isArray(match.bowlingScorecard) ? (match.bowlingScorecard as BowlingRow[]) : [];
  const fow = Array.isArray(match.fallOfWickets) ? (match.fallOfWickets as FallOfWicket[]) : [];
  const cards = innings.length
    ? innings
    : batting.length || bowling.length
      ? [{ number: 0, label: 'Scorecard', battingTeam: 'Batting', bowlingTeam: 'Bowling', batting, bowling }]
      : [];
  if (cards.length === 0) {
    return (
      <EmptyState
        title="Scorecard not in yet"
        message="Player rows appear from ball-by-ball when Commentary has loaded, or when the feed sends a batting card."
      />
    );
  }
  return (
    <div className="space-y-8">
      {cards.map((card) => (
        <section key={`${card.label}-${card.number}`} className="space-y-3">
          <h3 className="text-sm font-bold text-mtext">{card.label}</h3>
          <ScoreTable
            title="Batting"
            team={card.battingTeam || 'Batting side'}
            headers={['Batter', 'Runs', 'Balls', '4s', '6s', 'SR']}
            rows={card.batting.map((row) => [
              `${row.name}${row.out === false ? ' (not out)' : ''}`,
              cell(row.runs),
              cell(row.balls),
              cell(row.fours),
              cell(row.sixes),
              cell(row.sr),
            ])}
          />
          <ScoreTable
            title="Bowling"
            team={card.bowlingTeam || 'Bowling side'}
            headers={['Bowler', 'Overs', 'Maidens', 'Runs', 'Wickets', 'Econ']}
            rows={card.bowling.map((row) => [
              cell(row.name),
              cell(row.overs),
              cell(row.maidens),
              cell(row.runs),
              cell(row.wickets),
              cell(row.econ),
            ])}
          />
        </section>
      ))}
      {fow.length > 0 && (
        <p className="text-sm text-stext">
          Fall of wickets:{' '}
          {fow.map((row) => `${row.wicket}-${row.runs}${row.batter ? ` (${row.batter})` : ''}`).join(', ')}
        </p>
      )}
    </div>
  );
}

function SquadList({ name, players }: { name: string; players: string[] }) {
  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
      <p className="mb-3 text-xs font-bold uppercase tracking-wider text-stext">{name}</p>
      {players.length > 0 ? (
        <ol className="space-y-1.5 text-sm text-mtext">
          {players.map((player, index) => (
            <li key={`${player}-${index}`} className="flex gap-2">
              <span className="w-5 shrink-0 font-mono text-xs text-stext">{index + 1}</span>
              <span>{player}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="text-sm text-stext">Playing XI is not in the feed yet for this side.</p>
      )}
    </div>
  );
}

export function SquadsPanel({
  match,
  homeName,
  awayName,
  timeline,
}: {
  match: Record<string, unknown>;
  homeName: string;
  awayName: string;
  timeline?: Record<string, unknown> | null;
}) {
  const extracted = extractSquads(match, timeline || null);
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <SquadList name={homeName} players={extracted.home} />
      <SquadList name={awayName} players={extracted.away} />
    </div>
  );
}

export function MatchNewsPanel({
  articles,
  loading = false,
}: {
  articles: NewsArticle[];
  loading?: boolean;
}) {
  return (
    <RelatedNewsPanel
      articles={articles}
      loading={loading}
      emptyTitle="No match news"
      emptyHint="Publish a story from Admin → News and link this match. Drafts do not appear here."
    />
  );
}

export function OversFromTimeline({
  timeline,
  inning,
}: {
  timeline: Record<string, unknown> | null;
  inning?: number;
}) {
  const balls = extractBalls(timeline, inning ? { inning } : undefined);
  if (balls.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-stext">This over</p>
      <BallTracker balls={balls} />
    </div>
  );
}
