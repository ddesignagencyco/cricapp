'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Radio } from 'lucide-react';
import Badge from './Badge';
import { getInitials } from '../utils/helpers';

interface MatchTickerBarProps {
  matches: any[];
}

export default function MatchTickerBar({ matches }: MatchTickerBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 340;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  if (!matches.length) return null;

  return (
    <div className="border-b border-lborder">
      <div className="mx-auto max-w-full px-4 sm:px-6">
        <div className="relative flex items-center gap-3 py-3">
          <button
            type="button"
            onClick={() => scroll('left')}
            className="z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-elevated text-stext ring-1 ring-lborder transition-colors hover:text-mtext"
            aria-label="Scroll left"
          >
            <ChevronLeft size={15} />
          </button>

          <div
            ref={scrollRef}
            className="no-scrollbar p-2 flex flex-1 gap-3 overflow-x-auto scroll-smooth"
          >
            {matches.map((m) => (
              <TickerCard key={m.matchId || m.id} match={m} />
            ))}
          </div>

          <button
            type="button"
            onClick={() => scroll('right')}
            className="z-10 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-elevated text-stext ring-1 ring-lborder transition-colors hover:text-mtext"
            aria-label="Scroll right"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

interface Side {
  name: string;
  short: string;
  score: string;
}

function pickTeams(match: any): { home: Side; away: Side; battingCode?: string } {
  const teams = match.teams as any;
  const obj = teams && typeof teams === 'object' && !Array.isArray(teams) ? teams : null;

  let homeCode = obj ? obj.home?.code : teams?.[0];
  let awayCode = obj ? obj.away?.code : teams?.[1];
  let homeName = obj ? obj.home?.name : match.teamNames?.[0];
  let awayName = obj ? obj.away?.name : match.teamNames?.[1];
  let homeScore = obj ? obj.home?.score || '' : '';
  let awayScore = obj ? obj.away?.score || '' : '';

  if (Array.isArray(teams) && !homeName) {
    homeName = teams[0];
    awayName = teams[1];
  }

  if (!homeName && !homeCode && obj && obj.home?.teamId) homeCode = obj.home.teamId;
  if (!awayName && !awayCode && obj && obj.away?.teamId) awayCode = obj.away.teamId;

  homeName = (homeName || homeCode || 'TBD').replace(/^sr:competitor:/, '');
  awayName = (awayName || awayCode || 'TBD').replace(/^sr:competitor:/, '');
  homeCode = (homeCode || homeName).replace(/^sr:competitor:/, '');
  awayCode = (awayCode || awayName).replace(/^sr:competitor:/, '');

  const battingCode = match.currentInnings?.battingTeam || null;

  if (!homeScore && !awayScore) {
    const innings = match.currentInnings;
    const sc = match.displayScore || (innings ? `${innings.runs}/${innings.wickets}` : '');
    if (sc && battingCode) {
      if (battingCode === homeCode) homeScore = sc;
      else if (battingCode === awayCode) awayScore = sc;
      else homeScore = sc;
    }
  }

  return { home: { name: homeName, short: homeCode, score: homeScore }, away: { name: awayName, short: awayCode, score: awayScore }, battingCode };
}

function TickerCard({ match }: { match: any }) {
  const { home, away, battingCode } = pickTeams(match);

  const status = match.status;
  const isLive = status === 'live';
  const isCompleted = status === 'completed';
  const isUpcoming = status === 'upcoming';

  const tournament = match.tournamentName || match.tournament || 'Cricket';
  const result = match.result || '';
  const venue = match.venue || '';

  const badgeLabel = isLive ? 'LIVE' : isCompleted ? 'RESULT' : 'UPCOMING';
  const badgeTone = isLive ? 'live' : isCompleted ? 'completed' : 'upcoming';

  const innings = match.currentInnings;
  const overs = innings && innings.overs !== null ? innings.overs : '';

  let homeScore = '';
  let awayScore = '';

  if (isLive) {
    const liveScore = match.displayScore || (innings ? `${innings.runs}/${innings.wickets}` : '');
    if (battingCode === home.short) homeScore = liveScore;
    else if (battingCode === away.short) awayScore = liveScore;
    else homeScore = liveScore;
  } else if (isCompleted) {
    homeScore = match.displayScore || home.score || '';
    awayScore = away.score || '';
  }

  return (
    <Link
      href={`/matches/${match.matchId || match.id}`}
      className="group flex w-[260px] shrink-0 flex-col overflow-hidden rounded-xl bg-card p-3 ring-1 ring-lborder transition-all hover:bg-elevated hover:ring-accent/30"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs font-bold uppercase tracking-wider text-stext">
          {tournament}
        </span>
        {isLive ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent2/15 px-2 py-0.5 text-xs font-black uppercase tracking-wider text-accent2">
            <Radio size={8} className="animate-pulse" /> Live
          </span>
        ) : (
          <Badge tone={badgeTone}>{badgeLabel}</Badge>
        )}
      </div>

      <div className="flex-1 space-y-1.5">
        <TeamRow name={home.name} label={home.short} score={homeScore} showDash={!isUpcoming} />
        <TeamRow name={away.name} label={away.short} score={awayScore} showDash={!isUpcoming} />
      </div>

      {(isLive || isCompleted) && (
        <div className="mt-2 flex h-4 items-center justify-center gap-1.5 overflow-hidden text-xs text-stext">
          {isLive && overs !== '' ? (
            <span className="shrink-0 font-semibold text-accent2">
              {Number(overs)} ov
              {match.currentInnings?.runRate ? ` • RR ${Number(match.currentInnings.runRate).toFixed(2)}` : ''}
            </span>
          ) : null}
          {result && <span className="min-w-0 truncate font-semibold text-gold">{result}</span>}
        </div>
      )}

      <div className="mt-2 flex items-center gap-1.5 border-t border-lborder/60 pt-1.5 text-xs text-stext">
        {venue ? (
          <span className="min-w-0 truncate" title={venue}>{venue.split(',')[0]}</span>
        ) : (
          <span suppressHydrationWarning className="truncate font-semibold text-stext/80">{scheduleTime(match)}</span>
        )}
        <span className="ml-auto shrink-0 font-semibold text-accent2">{formatShortDate(match)}</span>
      </div>
    </Link>
  );
}

function TeamRow({ name, label: _label, score, showDash }: { name: string; label: string; score: string; showDash?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <TeamMini label={name} />
      <p className="min-w-0 flex-1 truncate text-xs font-semibold text-mtext" title={name}>
        {name}
      </p>
      {score ? (
        <span className="shrink-0 font-mono text-sm font-bold text-accent2">{score}</span>
      ) : showDash ? (
        <span className="shrink-0 font-mono text-sm font-bold text-stext/60">&mdash;</span>
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
  let hash = 0;
  const key = label || '?';
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);

  return (
    <span
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 text-xs font-black text-white"
      style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 40) % 360}, 80%, 35%))` }}
    >
      {getInitials(label)}
    </span>
  );
}
