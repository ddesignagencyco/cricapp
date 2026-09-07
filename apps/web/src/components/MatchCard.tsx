'use client';

import Link from 'next/link';
import { Calendar, Clock, MapPin } from 'lucide-react';
import Badge from './Badge';
import LiveIndicator from './LiveIndicator';
import { formatScheduled } from '../utils/helpers';

interface MatchCardProps {
  match: any;
  compact?: boolean;
  showVenue?: boolean;
}

const statusTone: Record<string, string> = {
  live: 'live',
  upcoming: 'upcoming',
  completed: 'completed',
  cancelled: 'cancelled',
};

export default function MatchCard({ match, compact = false, showVenue = true }: MatchCardProps) {
  const codes = match.teams || [];
  const names = match.teamNames || [];
  const homeCode = codes[0] || '';
  const awayCode = codes[1] || '';
  const homeName = names[0] || homeCode;
  const awayName = names[1] || awayCode;

  const isLive = match.status === 'live';
  const isUpcoming = match.status === 'upcoming';
  const isCancelled = match.status === 'cancelled';
  const inn = match.currentInnings;
  const battingCode = inn?.battingTeam;
  const battingIsHome = battingCode === homeCode;

  const homeScore = isUpcoming || (isLive && battingCode && battingIsHome) ? (inn && battingIsHome ? match.displayScore : '') : '';
  const awayScore = isUpcoming || (isLive && battingCode && !battingIsHome) ? (inn && !battingIsHome ? match.displayScore : '') : '';
  const homeOvers = homeScore ? inn?.overs : '';
  const awayOvers = awayScore ? inn?.overs : '';

  const { date, time } = formatScheduled(match.scheduled);

  const cardStyles = 'bg-card hover:bg-elevated ring-lborder hover:ring-accent/30';

  return (
    <Link
      href={`/matches/${match.matchId}`}
      className={`group flex h-full flex-col rounded-xl p-5 ring-1 transition-all duration-300 hover:-translate-y-1 ${cardStyles}`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="block truncate text-xs font-bold uppercase tracking-widest text-mtext">
            {match.tournament || 'Cricket'}
          </span>
          {showVenue && !isUpcoming && !compact && (
            <span className="mt-1 flex h-[15px] items-center gap-1.5 truncate text-[11px] font-medium text-stext">
              {match.venue ? (
                <>
                  <MapPin size={12} className="shrink-0 text-accent/70" />
                  <span className="truncate">{match.venue}</span>
                </>
              ) : (
                <span>{'\u00A0'}</span>
              )}
            </span>
          )}
        </div>
        <Badge
          tone={statusTone[match.status]}>
          {isUpcoming ? 'Upcoming' : isCancelled ? 'Cancelled' : isLive ? "Live" : "Completed"}
        </Badge>
      </div>

      <div className="flex flex-1 items-center justify-between gap-2 py-4">
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center">
          <TeamCode code={homeCode} name={homeName} />
          <p className="mt-2 w-full truncate text-[14px] font-bold text-mtext" title={homeName}>{homeName}</p>
          {!isUpcoming && (
            <div className="mt-1">
              <p className={`font-mono text-[22px] font-black leading-none tabular-nums ${isLive ? 'text-accent2' : 'text-mtext'}`}>
                {homeScore || '\u2014'}
              </p>
              {homeOvers && <p className="mt-1 font-mono text-[11px] font-bold text-stext">{homeOvers} ov</p>}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-center justify-center px-1">
          <span className="rounded-full bg-elevated px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-stext">VS</span>
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center">
          <TeamCode code={awayCode} name={awayName} />
          <p className="mt-2 w-full truncate text-[14px] font-bold text-mtext" title={awayName}>{awayName}</p>
          {!isUpcoming && (
            <div className="mt-1">
              <p className={`font-mono text-[22px] font-black leading-none tabular-nums ${isLive ? 'text-accent2' : 'text-mtext'}`}>
                {awayScore || '\u2014'}
              </p>
              {awayOvers && <p className="mt-1 font-mono text-[11px] font-bold text-stext">{awayOvers} ov</p>}
            </div>
          )}
        </div>
      </div>

      {(isLive || isUpcoming) && (
        <div className="mt-4 border-t border-lborder/60 pt-3">
          {isLive ? (
            <p className="truncate text-xs font-bold text-accent2">
              {battingCode} {inn?.runs ?? 0}/{inn?.wickets ?? 0} <span className="font-medium text-stext">({inn?.overs ?? 0} ov · RR {inn?.runRate ?? 0})</span>
            </p>
          ) : isUpcoming ? (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] font-bold text-stext">
              <span className="flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-accent">
                <Calendar size={12} />
                {date}
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-accent/10 px-2.5 py-1 text-accent">
                <Clock size={12} />
                {time}
              </span>
            </div>
          ) : null}
        </div>
      )}
    </Link>
  );
}

function TeamCode({ code, name }: { code: string; name: string }) {
  const label = (name || code || '??').replace(/^(\w)\w*\s?(\w)?.*$/, '$1$2').toUpperCase() || (code || '??').slice(0, 2).toUpperCase();

  // Use a simple hash to assign a unique gradient hue to teams
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);

  return (
    <span
      className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/10 text-[13px] font-black tracking-tight text-white shadow-sm"
      style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 80%, 60%), hsl(${(hue + 40) % 360}, 90%, 40%))` }}
      title={name}
    >
      {label}
    </span>
  );
}
