'use client';

import Link from 'next/link';
import Badge from './Badge';
import { getInitials } from '../utils/helpers';

interface RecentResultCardProps {
  match: any;
}

export default function RecentResultCard({ match }: RecentResultCardProps) {
  const teams = match.teams;
  const isObj = teams && typeof teams === 'object' && !Array.isArray(teams);
  const home = isObj ? teams.home : null;
  const away = isObj ? teams.away : null;

  const homeCode = (home?.code || (Array.isArray(teams) ? teams[0] : '')).replace(/^sr:competitor:/, '');
  const awayCode = (away?.code || (Array.isArray(teams) ? teams[1] : '')).replace(/^sr:competitor:/, '');
  const homeName = (home?.name || match.teamNames?.[0] || homeCode || 'TBD').replace(/^sr:competitor:/, '');
  const awayName = (away?.name || match.teamNames?.[1] || awayCode || 'TBD').replace(/^sr:competitor:/, '');
  const homeScore = home?.score || '';
  const awayScore = away?.score || '';
  const homeOvers = home?.overs || '';
  const awayOvers = away?.overs || '';

  const result = match.result || '';
  const tournament = match.tournamentName || match.tournament || '';
  const venue = match.venue || '';
  const date = match.date || '';
  const playerOfMatch = match.playerOfMatch || '';

  const rawDate = match.date || match.scheduled || '';
  let dateLabel = date;
  if (rawDate) {
    const d = new Date(rawDate);
    if (!Number.isNaN(d.getTime())) {
      dateLabel = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  return (
    <Link
      href={`/matches/${match.matchId || match.id}`}
      className="group flex h-full flex-col rounded-2xl bg-card p-4 ring-1 ring-lborder transition-all duration-300 hover:-translate-y-0.5 hover:bg-elevated hover:ring-accent/30"
    >
      <div className="mb-4 flex items-start justify-between gap-2">
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

      <div className="flex-1 space-y-3">
        <ScoreRow code={homeCode} name={homeName} score={homeScore} overs={homeOvers} />
        <ScoreRow code={awayCode} name={awayName} score={awayScore} overs={awayOvers} />
      </div>

      {result && (
        <div className="mt-3 border-t border-lborder/50 pt-2.5">
          <p className="text-[11px] font-bold text-gold">{result}</p>
          {playerOfMatch && (
            <p className="mt-1 text-[10px] text-stext">
              Player of the Match: <span className="font-semibold text-mtext">{playerOfMatch}</span>
            </p>
          )}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2 text-[10px] text-stext">
        <span>{dateLabel}</span>
        {venue && <span className="truncate">• {venue.split(',')[0]}</span>}
      </div>
    </Link>
  );
}

function ScoreRow({ code, name, score, overs }: { code: string; name: string; score: string; overs: string }) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);

  return (
    <div className="flex items-center gap-2.5">
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 text-[9px] font-black text-white"
        style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 40) % 360}, 80%, 35%))` }}
        title={name}
      >
        {getInitials(name || code)}
      </span>
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
