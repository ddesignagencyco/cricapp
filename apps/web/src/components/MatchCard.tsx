'use client';

import Link from 'next/link';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { StatusBadge, BlinkingDot } from './Badge';
import RemoteImage from './RemoteImage';
import EntityAvatar from './EntityAvatar';
import { formatCricketOvers, formatScheduled, getInitials, getPslLogo } from '../utils/helpers';
import { describeMatchResult, scoreboardFromMatch } from '../lib/matchScoreboard';

interface MatchCardProps {
  match: any;
  compact?: boolean;
  showVenue?: boolean;
}

export default function MatchCard({ match, compact: _compact = false, showVenue = true }: MatchCardProps) {
  const board = scoreboardFromMatch(match);
  const home = board.home;
  const away = board.away;
  const isLive = match.status === 'live';
  const isUpcoming = match.status === 'upcoming';
  const inn = match.currentInnings;
  const { date, time } = formatScheduled(match.scheduled);
  const tournament = match.tournamentName || match.tournament || 'Cricket';
  const venue = match.venue || '';
  const result = describeMatchResult(match);
  const homeScore = board.homeScore;
  const awayScore = board.awayScore;
  const homeOvers = board.homeOvers;
  const awayOvers = board.awayOvers;
  const homeBatting = isLive && board.battingIsHome;
  const awayBatting = isLive && !board.battingIsHome;
  const sharedScore = !homeScore && !awayScore && !isUpcoming ? match.displayScore || '' : '';
  const footerRight = isUpcoming && showVenue && venue
    ? venue.split(',')[0]
    : !isUpcoming && !isLive
      ? result || sharedScore
      : '';
  const footerRightIsVenue = isUpcoming && !!footerRight;

  return (
    <Link
      href={`/matches/${match.matchId || match.id}`}
      prefetch={false}
      className="elev-card group flex h-full flex-col rounded-md border border-lborder bg-card p-3.5 transition-colors hover:border-accent/50 hover:bg-[var(--color-row-hover)]"
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="min-w-0 truncate text-xs font-semibold uppercase tracking-wide text-stext">
          {tournament}
        </p>
        <StatusBadge status={match.status} />
      </div>

      <div className="space-y-1.5">
        <TeamRow
          code={home.code}
          name={home.name}
          score={isUpcoming ? null : homeScore}
          overs={homeOvers}
          live={homeBatting}
        />
        <TeamRow
          code={away.code}
          name={away.name}
          score={isUpcoming ? null : awayScore}
          overs={awayOvers}
          live={awayBatting}
        />
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-lborder pt-2 text-xs">
        <p className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
          {isLive && inn ? (
            <span className="truncate font-semibold tabular-nums text-danger">
              <BlinkingDot className="mr-1.5 align-middle" />
              {board.battingLabel ? `${board.battingLabel} batting · ` : ''}
              {inn.overs !== null && inn.overs !== undefined ? `${formatCricketOvers(inn.overs) || inn.overs} ov` : 'In play'}
              {board.rrLabel && board.rrLabel !== '—' ? ` · RR ${board.rrLabel}` : ''}
            </span>
          ) : (
            <>
              {date && (
                <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-accent">
                  <Calendar size={12} />
                  {date}
                </span>
              )}
              {isUpcoming && time && (
                <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-mtext">
                  <Clock size={12} />
                  {time}
                </span>
              )}
            </>
          )}
        </p>
        {footerRight ? (
          <span
            className={`max-w-[48%] shrink-0 truncate text-right ${
              footerRightIsVenue
                ? 'inline-flex items-center justify-end gap-1 font-medium text-stext'
                : 'font-mono text-sm font-bold tabular-nums text-mtext'
            }`}
          >
            {footerRightIsVenue && <MapPin size={12} />}
            {footerRight}
          </span>
        ) : null}
      </div>
    </Link>
  );
}

function TeamRow({
  code,
  name,
  score,
  overs,
  live,
}: {
  code: string;
  name: string;
  score: string | null;
  overs: string;
  live?: boolean;
}) {
  const pslLogo = getPslLogo(code);

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
        <EntityAvatar className="h-7 w-7 text-[10px]" title={name}>
          {getInitials(name || code)}
        </EntityAvatar>
      )}
      <p className={`min-w-0 flex-1 truncate text-sm font-semibold ${live ? 'text-accent' : 'text-mtext'}`}>
        {name}
        {live ? <span className="ml-1.5 align-middle text-[10px] font-bold uppercase tracking-wide">Bat</span> : null}
      </p>
      {score !== null && (
        <div className="min-w-14 shrink-0 text-right">
          <p className={`font-mono text-sm font-bold tabular-nums ${live ? 'text-accent' : 'text-mtext'}`}>
            {score || '—'}
          </p>
          {overs && <p className="font-mono text-xs font-medium tabular-nums text-muted-foreground">{overs} ov</p>}
        </div>
      )}
    </div>
  );
}
