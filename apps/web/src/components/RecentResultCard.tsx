'use client';

import Link from 'next/link';
import { StatusBadge } from './Badge';
import RemoteImage from './RemoteImage';
import { getInitials, getPslLogo } from '../utils/helpers';

interface RecentResultCardProps {
  match: any;
}

export default function RecentResultCard({ match }: RecentResultCardProps) {
  const teams = match.teams;
  const isObj = teams && typeof teams === 'object' && !Array.isArray(teams);
  const home = isObj ? teams.home : null;
  const away = isObj ? teams.away : null;

  const homeCode = String(home?.code || (Array.isArray(teams) ? teams[0] : '') || '').replace(/^sr:competitor:/, '');
  const awayCode = String(away?.code || (Array.isArray(teams) ? teams[1] : '') || '').replace(/^sr:competitor:/, '');
  const homeName = String(home?.name || match.teamNames?.[0] || homeCode || 'TBD').replace(/^sr:competitor:/, '');
  const awayName = String(away?.name || match.teamNames?.[1] || awayCode || 'TBD').replace(/^sr:competitor:/, '');
  const homeScore = home?.score || '';
  const awayScore = away?.score || '';
  const homeOvers = home?.overs || '';
  const awayOvers = away?.overs || '';
  const sharedScore = !homeScore && !awayScore ? match.displayScore || '' : '';

  const result = match.result || '';
  const tournament = match.tournamentName || match.tournament || '';
  const venue = match.venue || '';

  const rawDate = match.date || match.scheduled || '';
  let dateLabel = '';
  if (rawDate) {
    const d = new Date(rawDate);
    if (!Number.isNaN(d.getTime())) {
      dateLabel = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'Asia/Karachi',
      });
    }
  }

  return (
    <Link
      href={`/matches/${match.matchId || match.id}`}
      prefetch={false}
      className="group flex h-full flex-col rounded-md border border-lborder bg-card p-3.5 transition-colors hover:border-accent/50 hover:bg-elevated"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-medium uppercase tracking-wide text-stext">
          {tournament || 'Match'}
        </p>
        <StatusBadge status="completed" />
      </div>

      <div className="space-y-2">
        <ScoreRow code={homeCode} name={homeName} score={homeScore} overs={homeOvers} />
        <ScoreRow code={awayCode} name={awayName} score={awayScore} overs={awayOvers} />
      </div>

      <div className="mt-3 space-y-1 border-t border-lborder pt-2.5">
        {result ? (
          <p className="text-xs font-medium text-mtext">{result}</p>
        ) : sharedScore ? (
          <p className="font-mono text-xs font-semibold text-mtext">{sharedScore}</p>
        ) : null}
        <p className="truncate text-xs text-stext">
          {[dateLabel, venue ? venue.split(',')[0] : ''].filter(Boolean).join(' · ')}
        </p>
      </div>
    </Link>
  );
}

function ScoreRow({ code, name, score, overs }: { code: string; name: string; score: string; overs: string }) {
  const pslLogo = getPslLogo(code);
  let hash = 0;
  for (let i = 0; i < (code || name).length; i++) hash = (code || name).charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);

  return (
    <div className="flex items-center gap-2.5">
      {pslLogo ? (
        <RemoteImage
          src={pslLogo}
          alt={name}
          width={28}
          height={28}
          className="h-7 w-7 shrink-0 rounded-full border border-lborder bg-white object-contain p-0.5"
        />
      ) : (
        <span
          className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white"
          style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 65%, 48%), hsl(${(hue + 28) % 360}, 75%, 32%))` }}
          title={name}
        >
          {getInitials(name || code)}
        </span>
      )}
      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-mtext">{name}</p>
      <div className="shrink-0 text-right">
        <p className="font-mono text-sm font-semibold tabular-nums text-mtext">{score || '—'}</p>
        {overs && <p className="font-mono text-[11px] text-stext">{overs} ov</p>}
      </div>
    </div>
  );
}
