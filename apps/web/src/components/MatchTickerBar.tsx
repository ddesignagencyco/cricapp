'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
    <div className="border-b border-lborder bg-secondary/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
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
            className="no-scrollbar flex flex-1 gap-4 overflow-x-auto scroll-smooth"
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

function TickerCard({ match }: { match: any }) {
  const teams = match.teams;
  const isObj = teams && typeof teams === 'object' && !Array.isArray(teams);
  const home = isObj ? teams.home : null;
  const away = isObj ? teams.away : null;

  const homeCode = home?.code || (Array.isArray(teams) ? teams[0] : '');
  const awayCode = away?.code || (Array.isArray(teams) ? teams[1] : '');
  const homeName = home?.name || homeCode;
  const awayName = away?.name || awayCode;
  const homeScore = home?.score || '';
  const awayScore = away?.score || '';

  const status = match.status;
  const isLive = status === 'live';
  const isCompleted = status === 'completed';
  const isUpcoming = status === 'upcoming';

  const venue = match.venue || '';
  const date = match.date || '';
  const result = match.result || '';

  const badgeLabel = isLive ? 'LIVE' : isCompleted ? 'RESULT' : isUpcoming ? 'UPCOMING' : status;
  const badgeTone = isLive ? 'live' : isCompleted ? 'completed' : 'upcoming';

  const tournament = match.tournamentName || match.tournament || '';

  return (
    <Link
      href={`/matches/${match.matchId || match.id}`}
      className="group flex w-[310px] shrink-0 flex-col overflow-hidden rounded-lg bg-card p-3.5 ring-1 ring-lborder transition-all hover:bg-elevated hover:ring-accent/30"
    >
      <div className="mb-2.5 flex items-center gap-2 overflow-hidden">
        <Badge tone={badgeTone}>{badgeLabel}</Badge>
        <span className="min-w-0 flex-1 truncate text-[10px] font-bold uppercase tracking-wider text-stext">
          {tournament}
        </span>
        {match.matchNumber && (
          <span className="shrink-0 text-[10px] text-stext">{match.matchNumber}</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <TeamMini code={homeCode} name={homeName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold text-mtext">{homeCode}</p>
            {!isUpcoming && homeScore && (
              <p className="font-mono text-xs font-bold text-accent2">{homeScore}</p>
            )}
          </div>
        </div>

        <span className="shrink-0 text-[10px] font-bold text-stext">vs</span>

        <div className="flex min-w-0 flex-1 items-center gap-2">
          <TeamMini code={awayCode} name={awayName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-bold text-mtext">{awayCode}</p>
            {!isUpcoming && awayScore && (
              <p className="font-mono text-xs font-bold text-accent2">{awayScore}</p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2.5 border-t border-lborder/50 pt-2">
        {isLive && result ? (
          <p className="truncate text-[10px] font-semibold text-accent2">{result}</p>
        ) : isCompleted && result ? (
          <p className="truncate text-[10px] font-semibold text-gold">{result}</p>
        ) : (
          <div className="flex items-center gap-1.5 overflow-hidden text-[10px] text-stext">
            {date && <span className="shrink-0">{date}</span>}
            {venue && <span className="min-w-0 truncate">• {venue.split(',')[0]}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}

function TeamMini({ code, name }: { code: string; name: string }) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);

  return (
    <span
      className="grid h-7 w-7 shrink-0 place-items-center rounded-full border border-white/10 text-[9px] font-black text-white"
      style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 40) % 360}, 80%, 35%))` }}
      title={name}
    >
      {getInitials(name || code)}
    </span>
  );
}
