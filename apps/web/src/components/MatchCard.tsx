'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { StatusBadge, BlinkingDot } from './Badge';
import RemoteImage from './RemoteImage';
import EntityAvatar from './EntityAvatar';
import { formatScheduled, getInitials, getPslLogo } from '../utils/helpers';
import { deriveMatchState } from '../hooks/useMatchState';
import { describeMatchResult, scoreboardFromMatch } from '../lib/matchScoreboard';
import { cardInteractive } from './ui/interaction';

interface MatchCardProps {
  match: any;
  /** Compact layout — four cards per row on wide screens. */
  dense?: boolean;
  showVenue?: boolean;
  /**
   * Uniform layout for mixed-status grids such as the favourites page: every card
   * uses the same stacked footer (status/result line over the date) and the team
   * rows print scores only — never overs — so completed, live and upcoming cards
   * all take the same shape.
   */
  uniform?: boolean;
  /**
   * Rendered in the header, before the status badge. Favourited cards slot their
   * remove button here so it sits beside the badge instead of stacked on top of it.
   */
  action?: ReactNode;
}

export default function MatchCard({
  match,
  dense = false,
  showVenue = true,
  uniform = false,
  action,
}: MatchCardProps) {
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
  // `board.homeOvers` / `board.awayOvers` come from `teams.*.overs`, which the API
  // rounds to whole overs — the card would print "9 ov" while the match page, reading
  // `displayOvers`, printed "9.4 ov". While live, the batting side's overs must come
  // from the single shared source instead so both pages agree.
  const state = deriveMatchState(match);
  const homeOvers = state.isLive && state.battingIsHome && state.oversLabel
    ? state.oversLabel
    : board.homeOvers;
  const awayOvers = state.isLive && !state.battingIsHome && state.oversLabel
    ? state.oversLabel
    : board.awayOvers;
  const homeBatting = isLive && state.battingIsHome;
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
  // A live card has no result to print, so in uniform mode the blinking "Live"
  // label takes the status slot — the footer keeps the same lines as its neighbours.
  const statusLine = uniform && isLive ? 'Live' : footerRight;
  const statusTone = uniform && isLive ? 'text-danger' : isUpcoming ? 'text-stext' : 'text-gold';
  const showStackedResult = uniform || (!isLive && !isUpcoming && Boolean(footerRight));
  // Overs vary from card to card and are the reason a grid of favourites lined up
  // raggedly; the uniform variant drops them and keeps the score alone.
  const homeRowOvers = uniform ? '' : homeOvers;
  const awayRowOvers = uniform ? '' : awayOvers;

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
        <div className="flex shrink-0 items-center gap-1.5">
          <StatusBadge status={match.status} />
          {action}
        </div>
      </div>

      <div className={dense ? 'space-y-1' : 'space-y-1.5'}>
        <TeamRow
          code={home.code}
          name={home.name}
          score={isUpcoming ? null : homeScore}
          overs={homeRowOvers}
          live={homeBatting}
          upcoming={isUpcoming}
          dense={dense}
        />
        <TeamRow
          code={away.code}
          name={away.name}
          score={isUpcoming ? null : awayScore}
          overs={awayRowOvers}
          live={awayBatting}
          upcoming={isUpcoming}
          dense={dense}
        />
      </div>

      {showStackedResult ? (
        <div
          className={`border-t border-lborder ${dense ? 'mt-2 space-y-1.5 pt-1.5' : 'mt-2.5 space-y-2 pt-2.5'}`}
        >
          {statusLine ? (
            <p
              className={`font-semibold leading-snug ${statusTone} ${dense ? 'text-[11px]' : 'text-xs sm:text-sm'}`}
              title={statusLine}
            >
              {uniform && isLive ? <BlinkingDot className="mr-1.5 align-middle" /> : null}
              {statusLine}
            </p>
          ) : null}
          {(date || (isUpcoming && time)) && (
            <p
              className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-stext ${dense ? 'text-[10px]' : 'text-xs'}`}
            >
              {date ? (
                <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-accent">
                  <Calendar size={12} aria-hidden />
                  {date}
                </span>
              ) : null}
              {isUpcoming && time ? (
                <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-mtext">
                  <Clock size={12} aria-hidden />
                  {time}
                </span>
              ) : null}
            </p>
          )}
        </div>
      ) : (
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
                {state.isLive && state.oversLabel
                  ? `${state.oversLabel} ov`
                  : 'In play'}
                {board.rrLabel && board.rrLabel !== '—' ? ` · RR ${board.rrLabel}` : ''}
              </span>
            ) : (
              <>
                {date && (
                  <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-accent">
                    <Calendar size={12} aria-hidden />
                    {date}
                  </span>
                )}
                {isUpcoming && time && (
                  <span className="inline-flex items-center gap-1 font-semibold tabular-nums text-mtext">
                    <Clock size={12} aria-hidden />
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
              className={`min-w-0 text-right ${
                footerRightIsVenue
                  ? 'inline-flex max-w-[55%] shrink-0 items-center justify-end gap-1 truncate font-medium text-stext'
                  : footerRightIsMeta
                    ? 'max-w-[55%] shrink-0 truncate text-xs font-semibold text-stext'
                    : 'max-w-[55%] shrink-0 truncate font-mono text-sm font-bold tabular-nums text-mtext'
              }`}
            >
              {footerRightIsVenue && <MapPin size={12} aria-hidden />}
              {footerRight}
            </span>
          ) : null}
        </div>
      )}
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
            {!upcoming && overs && (
            <span className="font-mono text-xs font-medium tabular-nums text-muted-foreground ml-2">({overs} ov)</span>
          )}
          </p>
          
        </div>
      )}
    </div>
  );
}
