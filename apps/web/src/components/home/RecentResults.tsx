'use client';

import Link from 'next/link';
import { getInitials } from '../../utils/helpers';
import Badge from '../Badge';

interface RecentResultsProps {
  matches: any[];
}

export default function RecentResults({ matches }: RecentResultsProps) {
  if (!matches.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <h2 className="text-xl font-bold tracking-tight text-mtext sm:text-2xl">Recent Results</h2>
        <Link
          href="/matches?tab=completed"
          className="shrink-0 whitespace-nowrap text-sm font-semibold text-accent transition-colors hover:text-accent2"
        >
          View all results
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {matches.map((m: any) => (
          <ResultCard key={m.matchId || m.id} match={m} />
        ))}
      </div>
    </section>
  );
}

function ResultCard({ match }: { match: any }) {
  const teams = match.teams;
  const isObj = teams && typeof teams === 'object' && !Array.isArray(teams);
  const home = isObj ? teams.home : null;
  const away = isObj ? teams.away : null;
  const homeCode = home?.code || (Array.isArray(teams) ? teams[0] : '');
  const awayCode = away?.code || (Array.isArray(teams) ? teams[1] : '');
  const homeName = home?.name || homeCode;
  const awayName = away?.name || awayCode;
  const homeScore = home?.score || '';
  const awayScore = away?.score || '';
  const homeOvers = home?.overs || '';
  const awayOvers = away?.overs || '';

  const result = match.result || '';
  const tournament = match.tournamentName || match.tournament || '';
  const venue = match.venue || '';

  return (
    <Link
      href={`/matches/${match.matchId || match.id}`}
      className="group flex h-full flex-col rounded-xl bg-card p-4 ring-1 ring-lborder transition-all duration-300 hover:-translate-y-0.5 hover:bg-elevated hover:ring-accent/30"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="block truncate text-[10px] font-bold uppercase tracking-wider text-stext">
            {tournament}
          </span>
          {venue && (
            <span className="mt-0.5 block truncate text-[10px] text-stext">
              {match.matchNumber ? `${match.matchNumber} ` : ''}{match.group || ''}
            </span>
          )}
        </div>
        <Badge tone="completed">RESULT</Badge>
      </div>

      <div className="flex-1 space-y-2.5">
        <ScoreRow code={homeCode} name={homeName} score={homeScore} overs={homeOvers} />
        <ScoreRow code={awayCode} name={awayName} score={awayScore} overs={awayOvers} />
      </div>

      {result && (
        <div className="mt-3 border-t border-lborder/50 pt-2.5">
          <p className="text-[11px] font-bold text-gold">{result}</p>
        </div>
      )}
    </Link>
  );
}

function ScoreRow({ code, name, score, overs }: { code: string; name: string; score: string; overs: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <TeamBadge code={code} name={name} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold text-mtext">{name}</p>
      </div>
      <div className="text-right">
        <p className="font-mono text-sm font-bold tabular-nums text-mtext">{score || '—'}</p>
        {overs && <p className="font-mono text-[10px] text-stext">({overs} ov)</p>}
      </div>
    </div>
  );
}

function TeamBadge({ code, name }: { code: string; name: string }) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);

  return (
    <span
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 text-[9px] font-black text-white"
      style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 40) % 360}, 80%, 35%))` }}
      title={name}
    >
      {getInitials(name || code)}
    </span>
  );
}
