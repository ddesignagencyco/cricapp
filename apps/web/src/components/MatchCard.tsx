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
  const inn = match.currentInnings;
  const battingCode = inn?.battingTeam;
  const battingIsHome = battingCode === homeCode;

  const homeScore = isUpcoming || (isLive && battingCode && battingIsHome) ? (inn && battingIsHome ? match.displayScore : '') : '';
  const awayScore = isUpcoming || (isLive && battingCode && !battingIsHome) ? (inn && !battingIsHome ? match.displayScore : '') : '';
  const homeOvers = homeScore ? inn?.overs : '';
  const awayOvers = awayScore ? inn?.overs : '';

  const { date, time } = formatScheduled(match.scheduled);

  return (
    <Link
      href={`/matches/${match.matchId}`}
      className="group block rounded-sm bg-card p-4 ring-1 ring-lborder transition-all duration-300 hover:-translate-y-0.5 hover:bg-elevated hover:ring-accent/30"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-stext">
          {match.tournament || 'Cricket'}
        </span>
        {isLive ? (
          <LiveIndicator />
        ) : (
          <Badge tone={statusTone[match.status]}>{isUpcoming ? 'Upcoming' : 'Completed'}</Badge>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <TeamCode code={homeCode} name={homeName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-mtext">{homeName}</p>
            <p className="text-xs text-stext">{homeCode}</p>
          </div>
          {!isUpcoming && (
            <div className="text-right">
              <p className="font-mono text-lg font-bold tabular-nums text-mtext">
                {homeScore || '\u2014'}
              </p>
              {homeOvers && <p className="font-mono text-[11px] text-stext">{homeOvers} ov</p>}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <TeamCode code={awayCode} name={awayName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-mtext">{awayName}</p>
            <p className="text-xs text-stext">{awayCode}</p>
          </div>
          {!isUpcoming && (
            <div className="text-right">
              <p className="font-mono text-lg font-bold tabular-nums text-mtext">
                {awayScore || '\u2014'}
              </p>
              {awayOvers && <p className="font-mono text-[11px] text-stext">{awayOvers} ov</p>}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 border-t border-lborder pt-3">
        {isLive ? (
          <p className="truncate text-xs font-medium text-accent">
            {battingCode} {inn?.runs ?? 0}/{inn?.wickets ?? 0} ({inn?.overs ?? 0} ov \u00B7 RR {inn?.runRate ?? 0})
          </p>
        ) : isUpcoming ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stext">
            <span className="flex items-center gap-1">
              <Calendar size={13} />
              {date}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={13} />
              {time}
            </span>
          </div>
        ) : (
          <p className="truncate text-xs font-medium text-gold">{match.matchStatus || 'Completed'}</p>
        )}
        {showVenue && match.venue && !isUpcoming && !compact && (
          <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-stext">
            <MapPin size={12} />
            {match.venue}
          </p>
        )}
      </div>
    </Link>
  );
}

function TeamCode({ code, name }: { code: string; name: string }) {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-accent bg-primary text-[13px] font-extrabold tracking-tight text-accent" title={name}>
      {(name || code || '??').replace(/^(\w)\w*\s?(\w)?.*$/, '$1$2').toUpperCase() || (code || '??').slice(0, 2).toUpperCase()}
    </span>
  );
}
