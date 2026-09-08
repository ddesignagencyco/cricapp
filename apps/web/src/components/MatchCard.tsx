'use client';

import Link from 'next/link';
import { Calendar, Clock, MapPin } from 'lucide-react';
import Badge from './Badge';
import LiveIndicator from './LiveIndicator';
import { formatScheduled, getPslLogo } from '../utils/helpers';

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

  const cardStyles = 'bg-card hover:bg-elevated border border-lborder/40 shadow-sm hover:shadow-xl hover:border-accent/40';

  return (
    <Link
      href={`/matches/${match.matchId}`}
      className={`group flex h-full flex-col rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 ${cardStyles}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3 border-b border-lborder/50 pb-3">
        <div className="min-w-0 flex-1">
          <span className="block truncate text-xs font-black uppercase tracking-[0.2em] text-accent">
            {match.tournament || 'Cricket'}
          </span>
          {showVenue && !isUpcoming && !compact && (
            <span className="mt-1.5 flex items-center gap-1.5 truncate text-xs font-medium text-stext">
              {match.venue ? (
                <>
                  <MapPin size={14} className="shrink-0 text-accent/60" />
                  <span className="truncate">{match.venue}</span>
                </>
              ) : (
                <span>{'\u00A0'}</span>
              )}
            </span>
          )}
        </div>
        <Badge tone={statusTone[match.status]}>
          {isUpcoming ? 'Upcoming' : isCancelled ? 'Cancelled' : isLive ? "Live" : "Completed"}
        </Badge>
      </div>

      <div className="flex flex-1 items-center justify-between gap-2 py-4">
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center">
          <TeamCode code={homeCode} name={homeName} />
          <p className="mt-4 w-full truncate text-sm font-extrabold text-mtext" title={homeName}>{homeName}</p>
          {!isUpcoming && (
            <div className="mt-2 text-center">
              <p className={`font-mono text-3xl font-black tracking-tighter leading-none tabular-nums ${isLive ? 'text-accent' : 'text-mtext'}`}>
                {homeScore || '\u2014'}
              </p>
              {homeOvers && <p className="mt-1 font-mono text-xs font-bold text-stext/80">{homeOvers} ov</p>}
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col items-center justify-center px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-elevated border border-lborder/80 shadow-inner">
            <span className="text-[10px] font-black italic text-stext/70">VS</span>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col items-center justify-center text-center">
          <TeamCode code={awayCode} name={awayName} />
          <p className="mt-4 w-full truncate text-sm font-extrabold text-mtext" title={awayName}>{awayName}</p>
          {!isUpcoming && (
            <div className="mt-2 text-center">
              <p className={`font-mono text-3xl font-black tracking-tighter leading-none tabular-nums ${isLive ? 'text-accent' : 'text-mtext'}`}>
                {awayScore || '\u2014'}
              </p>
              {awayOvers && <p className="mt-1 font-mono text-xs font-bold text-stext/80">{awayOvers} ov</p>}
            </div>
          )}
        </div>
      </div>

      {(isLive || isUpcoming) && (
        <div className="mt-5 rounded-xl bg-elevated/50 p-4 border border-white/5">
          {isLive ? (
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-accent2 live-pulse" />
              <p className="truncate text-sm font-bold text-accent2">
                {battingCode} {inn?.runs ?? 0}/{inn?.wickets ?? 0} <span className="ml-1 text-xs font-medium text-stext/80">({inn?.overs ?? 0} ov · RR {inn?.runRate ?? 0})</span>
              </p>
            </div>
          ) : isUpcoming ? (
            <div className="flex items-center justify-center gap-6 text-xs font-bold text-stext">
              <span className="flex items-center gap-2">
                <Calendar size={14} className="text-accent" />
                {date}
              </span>
              <span className="flex items-center gap-2">
                <Clock size={14} className="text-accent" />
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
  const pslLogo = getPslLogo(code);
  const label = (name || code || '??').replace(/^(\w)\w*\s?(\w)?.*$/, '$1$2').toUpperCase() || (code || '??').slice(0, 2).toUpperCase();

  // Use a simple hash to assign a unique gradient hue to teams
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);

  return (
    <div className="relative group-hover:scale-105 transition-transform duration-500">
      {pslLogo ? (
        <img
          src={pslLogo}
          alt={name}
          title={name}
          className="relative h-12 w-12 shrink-0 rounded-full border border-white/10 bg-white object-contain p-0.5"
        />
      ) : (
        <span
          className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-white/20 text-sm font-black tracking-tighter text-white shadow-md"
          style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 30) % 360}, 90%, 30%))` }}
          title={name}
        >
          {label}
        </span>
      )}
    </div>
  );
}
