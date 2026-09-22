'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Badge, { normalizeStatus } from './Badge';
import LiveIndicator from './LiveIndicator';
import EntityAvatar from './EntityAvatar';
import { formatCricketOvers, getInitials } from '../utils/helpers';
import { mergeLiveUpdate, useMatchStream } from '../hooks/useMatchStream';
import { describeMatchResult, scoreboardFromMatch } from '../lib/matchScoreboard';

interface MatchTickerBarProps {
  matches: any[];
}

export default function MatchTickerBar({ matches: initialMatches }: MatchTickerBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [matches, setMatches] = useState(initialMatches || []);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const liveUpdate = useMatchStream(undefined, true);
  const overflows = canScrollLeft || canScrollRight;

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 1);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
  };

  useEffect(() => {
    setMatches(initialMatches || []);
  }, [initialMatches]);

  useEffect(() => {
    if (!liveUpdate) return;
    setMatches((prev) => mergeLiveUpdate(prev, liveUpdate));
  }, [liveUpdate]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [matches]);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 340;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  if (!matches.length) return null;

  return (
    <div className="border-b border-lborder">
      <div className="mx-auto max-w-full px-4 sm:px-6">
        <div className="flex items-center gap-3 py-3">
          <button
            type="button"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-elevated text-stext ring-1 ring-lborder transition-colors hover:text-mtext disabled:cursor-default disabled:opacity-40 disabled:hover:text-stext"
            aria-label="Scroll left"
          >
            <ChevronLeft size={16} />
          </button>

          <div
            ref={scrollRef}
            className={`no-scrollbar min-w-0 flex-1 flex gap-3 overflow-x-auto scroll-smooth py-2 ${
              overflows ? '' : 'justify-center'
            }`}
          >
            {matches.map((m) => (
              <TickerCard key={m.matchId || m.id} match={m} />
            ))}
          </div>

          <button
            type="button"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-elevated text-stext ring-1 ring-lborder transition-colors hover:text-mtext disabled:cursor-default disabled:opacity-40 disabled:hover:text-stext"
            aria-label="Scroll right"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

function TickerCard({ match }: { match: any }) {
  const board = scoreboardFromMatch(match);
  const home = board.home;
  const away = board.away;
  const homeScore = board.homeScore;
  const awayScore = board.awayScore;

  const status = match.status;
  const isLive = status === 'live';
  const isCompleted = status === 'completed' || status === 'ended';
  const isUpcoming = status === 'upcoming';

  const tournament = match.tournamentName || match.tournament || 'Cricket';
  const result = isCompleted ? describeMatchResult(match) : '';
  const venue = match.venue || '';

  const normalizedStatus = normalizeStatus(status);
  const badgeLabel = isCompleted ? 'Result' : normalizedStatus.label;
  const badgeTone = normalizedStatus.tone;

  const overs = board.oversLabel || match.currentInnings?.overs || '';

  return (
    <Link
      href={`/matches/${match.matchId || match.id}`}
      prefetch={false}
      className="group flex w-[260px] shrink-0 flex-col overflow-hidden rounded-xl bg-card p-3 ring-1 ring-lborder transition-colors hover:bg-[var(--color-row-hover)] hover:ring-border-strong"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-semibold tracking-wide text-stext">
          {tournament}
        </span>
        {isLive ? (
          <LiveIndicator label="Live" className="shrink-0" />
        ) : (
          <Badge tone={badgeTone} className="shrink-0">
            {badgeLabel}
          </Badge>
        )}
      </div>

      <div className="flex-1 space-y-1.5">
        <TeamRow
          name={home.name}
          score={homeScore}
          showDash={!isUpcoming}
          batting={isLive && board.battingIsHome}
        />
        <TeamRow
          name={away.name}
          score={awayScore}
          showDash={!isUpcoming}
          batting={isLive && !board.battingIsHome}
        />
      </div>

      {(isLive || isCompleted) && (
        <div className="mt-2 flex h-4 items-center justify-center gap-1.5 overflow-hidden text-xs text-stext">
          {isLive && overs !== '' ? (
            <span className="shrink-0 font-semibold text-danger">
              {board.battingLabel ? `${board.battingLabel} batting · ` : ''}
              {formatCricketOvers(overs) || overs} ov
              {board.rrLabel && board.rrLabel !== '—' ? ` · RR ${board.rrLabel}` : ''}
            </span>
          ) : null}
          {isCompleted ? (
            <span className="min-w-0 truncate font-semibold text-gold">
              {result}
            </span>
          ) : null}
        </div>
      )}

      <div className="mt-2 flex items-center gap-1.5 border-t border-lborder pt-1.5 text-xs">
        <span className="shrink-0 font-semibold tabular-nums text-accent">{formatShortDate(match)}</span>
        {scheduleTime(match) ? (
          <span suppressHydrationWarning className="shrink-0 font-semibold tabular-nums text-mtext">{scheduleTime(match)}</span>
        ) : null}
        {venue ? (
          <span className="ml-auto min-w-0 truncate font-medium text-stext" title={venue}>{venue.split(',')[0]}</span>
        ) : null}
      </div>
    </Link>
  );
}

function TeamRow({
  name,
  score,
  showDash,
  batting,
}: {
  name: string;
  score: string;
  showDash?: boolean;
  batting?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <TeamMini label={name} />
      <p className={`min-w-0 flex-1 truncate text-sm font-semibold ${batting ? 'text-accent' : 'text-mtext'}`} title={name}>
        {name}
        {batting ? <span className="ml-1.5 align-middle text-[10px] font-bold uppercase tracking-wide">Bat</span> : null}
      </p>
      {score ? (
        <span className={`shrink-0 font-mono text-sm font-bold tabular-nums ${batting ? 'text-accent' : 'text-mtext'}`}>{score}</span>
      ) : showDash ? (
        <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-muted-foreground">&mdash;</span>
      ) : null}
    </div>
  );
}

function formatShortDate(match: any): string {
  const raw = match.date || match.scheduled || '';
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function scheduleTime(match: any): string {
  const raw = match.scheduled || match.date || '';
  if (!raw) return '';
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function TeamMini({ label }: { label: string }) {
  return (
    <EntityAvatar className="h-7 w-7 text-xs font-black">{getInitials(label)}</EntityAvatar>
  );
}
