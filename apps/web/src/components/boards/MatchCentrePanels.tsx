import EmptyState from '../EmptyState';
import BallTracker from '../BallTracker';
import { extractBalls } from '../MatchTimeline';
import { RelatedNewsPanel } from './RelatedNewsPanel';
import type {
  BattingRow,
  BowlingRow,
  FallOfWicket,
  LiveBatsman,
  LiveBowler,
  NewsArticle,
  OverSummary,
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
  const crr = match.currentRunRate ?? (match.currentInnings as { runRate?: number } | undefined)?.runRate;
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
            {hasValue(crr) ? `CRR ${crr}` : ''}
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

export function ScorecardPanel({ match }: { match: Record<string, unknown> }) {
  const batting = Array.isArray(match.battingScorecard) ? (match.battingScorecard as BattingRow[]) : [];
  const bowling = Array.isArray(match.bowlingScorecard) ? (match.bowlingScorecard as BowlingRow[]) : [];
  const fow = Array.isArray(match.fallOfWickets) ? (match.fallOfWickets as FallOfWicket[]) : [];
  if (batting.length === 0 && bowling.length === 0) {
    return <EmptyState title="Scorecard not in yet" message="Batting and bowling cards appear when the feed sends them." />;
  }
  return (
    <div className="space-y-6">
      {batting.length > 0 && (
        <div className="overflow-x-auto rounded-2xl bg-card ring-1 ring-lborder">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-lborder text-xs uppercase tracking-wider text-stext">
                <th className="px-4 py-3">Batter</th>
                <th className="px-3 py-3 text-right">R</th>
                <th className="px-3 py-3 text-right">B</th>
                <th className="px-3 py-3 text-right">4s</th>
                <th className="px-3 py-3 text-right">6s</th>
                <th className="px-4 py-3 text-right">SR</th>
              </tr>
            </thead>
            <tbody>
              {batting.map((row, index) => (
                <tr key={row.id || `${row.name}-${index}`} className="border-b border-lborder/60">
                  <td className="px-4 py-2.5 text-mtext">
                    {row.name}
                    {row.out === false ? <span className="ml-1 text-xs text-accent">not out</span> : null}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">{row.runs}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{row.balls}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{row.fours}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{row.sixes}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{row.sr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {bowling.length > 0 && (
        <div className="overflow-x-auto rounded-2xl bg-card ring-1 ring-lborder">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-lborder text-xs uppercase tracking-wider text-stext">
                <th className="px-4 py-3">Bowler</th>
                <th className="px-3 py-3 text-right">O</th>
                <th className="px-3 py-3 text-right">M</th>
                <th className="px-3 py-3 text-right">R</th>
                <th className="px-3 py-3 text-right">W</th>
                <th className="px-4 py-3 text-right">Econ</th>
              </tr>
            </thead>
            <tbody>
              {bowling.map((row, index) => (
                <tr key={row.id || `${row.name}-${index}`} className="border-b border-lborder/60">
                  <td className="px-4 py-2.5 text-mtext">{row.name}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{row.overs}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{row.maidens}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{row.runs}</td>
                  <td className="px-3 py-2.5 text-right font-mono">{row.wickets}</td>
                  <td className="px-4 py-2.5 text-right font-mono">{row.econ}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {fow.length > 0 && (
        <p className="text-sm text-stext">
          Fall of wickets:{' '}
          {fow.map((row) => `${row.wicket}-${row.runs}${row.batter ? ` (${row.batter})` : ''}`).join(', ')}
        </p>
      )}
    </div>
  );
}

export function SquadsPanel({ match, homeName, awayName }: { match: Record<string, unknown>; homeName: string; awayName: string }) {
  const teams = match.teams;
  const isObj = teams && typeof teams === 'object' && !Array.isArray(teams);
  const home = isObj ? sidePlayers((teams as { home?: unknown }).home) : [];
  const away = isObj ? sidePlayers((teams as { away?: unknown }).away) : [];
  const extras = sidePlayers(match.lineup || match.squads || match.xi);
  if (home.length === 0 && away.length === 0 && extras.length === 0) {
    return <EmptyState title="XI not listed" message="Playing XI appears when the feed confirms the sides." />;
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {home.length > 0 && (
        <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-stext">{homeName}</p>
          <p className="text-sm leading-7 text-mtext">{home.join(', ')}</p>
        </div>
      )}
      {away.length > 0 && (
        <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-stext">{awayName}</p>
          <p className="text-sm leading-7 text-mtext">{away.join(', ')}</p>
        </div>
      )}
      {extras.length > 0 && home.length === 0 && (
        <p className="sm:col-span-2 text-sm leading-7 text-mtext">{extras.join(', ')}</p>
      )}
    </div>
  );
}

export function StatsPanel({ match }: { match: Record<string, unknown> }) {
  const inn = match.currentInnings && typeof match.currentInnings === 'object'
    ? (match.currentInnings as Record<string, unknown>)
    : {};
  const rows = [
    hasValue(match.target) ? ['Target', String(match.target)] : null,
    hasValue(inn.runRate) ? ['Current run rate', String(inn.runRate)] : null,
    hasValue(match.currentRunRate) ? ['CRR', String(match.currentRunRate)] : null,
    hasValue(match.requiredRunRate) ? ['Required run rate', String(match.requiredRunRate)] : null,
    Array.isArray(match.overSummary) && match.overSummary.length
      ? ['Overs logged', String((match.overSummary as OverSummary[]).length)]
      : null,
  ].filter((row): row is [string, string] => row !== null);

  if (rows.length === 0) {
    return <EmptyState title="No extra stats yet" message="Run rates and targets show once the innings is underway." />;
  }
  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
      {rows.map(([label, value]) => (
        <div key={label} className="flex justify-between gap-4 border-b border-lborder/60 py-2.5 last:border-0">
          <span className="text-xs uppercase tracking-wider text-stext">{label}</span>
          <span className="font-mono text-sm font-semibold text-mtext">{value}</span>
        </div>
      ))}
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

export function OversFromTimeline({ timeline }: { timeline: Record<string, unknown> | null }) {
  const balls = extractBalls(timeline);
  if (balls.length === 0) return null;
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-stext">This over</p>
      <BallTracker balls={balls} />
    </div>
  );
}
