'use client';

import Link from 'next/link';
import { Calendar, Clock, MapPin } from 'lucide-react';
import Badge from './Badge';
import LiveIndicator from './LiveIndicator';
import TeamLogo from './TeamLogo';
import { formatDate, formatTime } from '../utils/helpers';

const statusTone = {
  live: 'live',
  upcoming: 'upcoming',
  completed: 'completed',
};

export default function MatchCard({ match, compact = false, showVenue = true }) {
  const { home, away } = match.teams;
  const isLive = match.status === 'live';
  const isUpcoming = match.status === 'upcoming';

  return (
    <Link
      href={`/matches/${match.id}`}
      className="group block rounded-2xl bg-card p-4 ring-1 ring-lborder transition-all duration-300 hover:-translate-y-0.5 hover:bg-elevated hover:ring-accent/30"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-stext">
          {match.tournamentName}
          {match.matchNumber ? ` • Match ${match.matchNumber}` : ''}
        </span>
        {isLive ? (
          <LiveIndicator />
        ) : (
          <Badge tone={statusTone[match.status]}>{isUpcoming ? 'Upcoming' : 'Completed'}</Badge>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <TeamLogo teamId={home.teamId} name={home.name} size="sm" link={false} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-mtext">{home.name}</p>
            <p className="text-xs text-stext">{home.code}</p>
          </div>
          {!isUpcoming && (
            <div className="text-right">
              <p className="font-mono text-lg font-bold tabular-nums text-mtext">
                {home.score || '—'}
              </p>
              {home.overs && (
                <p className="font-mono text-[11px] text-stext">{home.overs} ov</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <TeamLogo teamId={away.teamId} name={away.name} size="sm" link={false} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-mtext">{away.name}</p>
            <p className="text-xs text-stext">{away.code}</p>
          </div>
          {!isUpcoming && (
            <div className="text-right">
              <p className="font-mono text-lg font-bold tabular-nums text-mtext">
                {away.score || '—'}
              </p>
              {away.overs && (
                <p className="font-mono text-[11px] text-stext">{away.overs} ov</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 border-t border-lborder pt-3">
        {isLive ? (
          <p className="truncate text-xs font-medium text-accent">
            {match.batsmen?.length
              ? `${match.batsmen[0].name} ${match.batsmen[0].runs} (${match.batsmen[0].balls})`
              : 'Match in progress'}
          </p>
        ) : isUpcoming ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stext">
            <span className="flex items-center gap-1">
              <Calendar size={13} />
              {formatDate(match.date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={13} />
              {formatTime(match.time)}
            </span>
          </div>
        ) : (
          <p className="truncate text-xs font-medium text-gold">{match.result}</p>
        )}
        {showVenue && !isUpcoming && !compact && (
          <p className="mt-1 flex items-center gap-1 truncate text-[11px] text-stext">
            <MapPin size={12} />
            {match.venue}
          </p>
        )}
      </div>
    </Link>
  );
}