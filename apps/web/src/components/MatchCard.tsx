'use client';

import Link from 'next/link';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { StatusBadge, BlinkingDot } from './Badge';
import RemoteImage from './RemoteImage';
import EntityAvatar from './EntityAvatar';
import { formatCricketOvers, formatScheduled, getInitials, getPslLogo } from '../utils/helpers';
import { describeMatchResult, scoreboardFromMatch } from '../lib/matchScoreboard';
import { cardInteractive } from './ui/interaction';

interface MatchCardProps {
  match: any;
  /** Compact layout — four cards per row on wide screens. */
  dense?: boolean;
  showVenue?: boolean;
}

export default function MatchCard({ match, dense = false, showVenue = true }: MatchCardProps) {
  const board = scoreboardFromMatch(match);
  const home = board.home;
  const away = board.away;
  const isLive = match.status === 'live';
  const isUpcoming = match.status === 'upcoming';
  const inn = match.currentInnings;
  const { date, time } = formatScheduled(match.scheduled);
  const tournament = match.tournamentName || match.tournament || 'Cricket';
  const result = describeMatchResult(match);
  const homeScore = board.homeScore;
  const awayScore = board.awayScore;
  const homeOvers = board.homeOvers;
  const awayOvers = board.awayOvers;
  const homeBatting = isLive && board.battingIsHome;
  const awayBatting = isLive && !board.battingIsHome;
  const sharedScore = !homeScore && !awayScore && !isUpcoming ? match.displayScore || '' : '';
  const formatLabel = matchFormatLabel(match);
  const locationLine = showVenue ? upcomingLocation(match) : '';
  const matchLabel =
    typeof match.matchNumber === 'number' && match.matchNumber > 0
      ? `Match ${match.matchNumber}`
      : typeof match.group === 'string' && match.group.trim()
        ? match.group.trim()
        : '';
  const footerRight = isUpcoming
    ? locationLine || formatLabel || matchLabel
    : !isLive
      ? result || sharedScore
      : '';
  const footerRightIsVenue = isUpcoming && !!locationLine;
  const footerRightIsMeta = isUpcoming && !locationLine && !!footerRight;

  return (
    <Link
      href={`/matches/${match.matchId || match.id}`}
      prefetch={false}
      className={`${cardInteractive} group flex h-full flex-col rounded-md ${dense ? 'p-2.5' : 'p-3.5'}`}
    >
      <div className={`flex items-center justify-between gap-2 ${dense ? 'mb-1.5' : 'mb-2.5'}`}>
        <p
          className={`min-w-0 truncate font-semibold uppercase tracking-wide text-stext ${
            dense ? 'text-[10px] leading-tight' : 'text-xs'
          }`}
        >
          {tournament}
        </p>
        <StatusBadge status={match.status} />
      </div>

      <div className={dense ? 'space-y-1' : 'space-y-1.5'}>
        <TeamRow
          code={home.code}
          name={home.name}
          score={isUpcoming ? null : homeScore}
          overs={homeOvers}
          live={homeBatting}
          upcoming={isUpcoming}
          dense={dense}
        />
        <TeamRow
          code={away.code}
          name={away.name}
          score={isUpcoming ? null : awayScore}
          overs={awayOvers}
          live={awayBatting}
          upcoming={isUpcoming}
          dense={dense}
        />
      </div>

      <div
        className={`flex items-center justify-between gap-2 border-t border-lborder ${
          dense ? 'mt-2 pt-1.5 text-[10px]' : 'mt-2.5 pt-2 text-xs'
        }`}
      >
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
              {isUpcoming && !dense && formatLabel && (
                <span className="inline-flex rounded bg-[var(--color-badge-neutral-bg)] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-stext">
                  {formatLabel}
                </span>
              )}
              {isUpcoming && !dense && matchLabel && (
                <span className="font-medium text-stext">{matchLabel}</span>
              )}
            </>
          )}
        </p>
        {footerRight ? (
          <span
            className={`max-w-[48%] shrink-0 truncate text-right ${
              footerRightIsVenue
                ? 'inline-flex items-center justify-end gap-1 font-medium text-stext'
                : footerRightIsMeta
                  ? 'text-xs font-semibold text-stext'
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

function matchFormatLabel(match: any): string {
  const raw =
    match.format ||
    match.matchFormat ||
    match.discipline ||
    (typeof match.type === 'string' ? match.type : '');
  if (typeof raw !== 'string' || !raw.trim()) return '';
  return raw.replace(/_/g, ' ').trim();
}

function upcomingLocation(match: any): string {
  if (!match) return '';
  const city = typeof match.city === 'string' ? match.city.trim() : '';
  const venue = typeof match.venue === 'string' ? match.venue.trim() : '';
  if (city && venue && !venue.toLowerCase().includes(city.toLowerCase())) {
    return `${city} · ${venue.split(',')[0]}`;
  }
  if (venue) return venue.split(',')[0];
  return city;
}

function TeamRow({
  code,
  name,
  score,
  overs,
  live,
  upcoming,
  dense,
}: {
  code: string;
  name: string;
  score: string | null;
  overs: string;
  live?: boolean;
  upcoming?: boolean;
  dense?: boolean;
}) {
  const pslLogo = getPslLogo(code);
  const avatarSize = dense ? 'h-6 w-6 text-[9px]' : 'h-7 w-7 text-[10px]';
  const imgSize = dense ? 24 : 28;

  return (
    <div className={`flex items-center ${dense ? 'gap-2' : 'gap-2.5'}`}>
      {pslLogo ? (
        <RemoteImage
          src={pslLogo}
          alt={name}
          width={imgSize}
          height={imgSize}
          className={`${avatarSize} shrink-0 rounded-full border border-lborder bg-white object-contain p-0.5`}
        />
      ) : (
        <EntityAvatar className={`${avatarSize} shrink-0`} title={name}>
          {getInitials(name || code)}
        </EntityAvatar>
      )}
      <p
        className={`min-w-0 flex-1 truncate font-semibold ${dense ? 'text-xs' : 'text-sm'} ${
          live ? 'text-accent' : 'text-mtext'
        }`}
      >
        {name}
        {live ? (
          <span className="ml-1 align-middle text-[9px] font-bold uppercase tracking-wide">Bat</span>
        ) : null}
      </p>
      {(score !== null || upcoming) && (
        <div className={`shrink-0 text-right ${dense ? 'min-w-10' : 'min-w-14'}`}>
          <p
            className={`font-mono font-black tabular-nums ${dense ? 'text-sm' : 'text-base'} ${
              live ? 'text-accent' : upcoming ? 'text-muted-foreground' : 'text-mtext'
            }`}
          >
            {upcoming ? '—' : score || '—'}
          </p>
          {!upcoming && overs && (
            <p className="font-mono text-xs font-medium tabular-nums text-muted-foreground">{overs} ov</p>
          )}
        </div>
      )}
    </div>
  );
}
