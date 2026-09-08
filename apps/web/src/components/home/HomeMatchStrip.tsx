'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Radio, Clock } from 'lucide-react';
import { getInitials } from '../../utils/helpers';

interface HomeMatchStripProps {
  matches: any[];
}

export default function HomeMatchStrip({ matches }: HomeMatchStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (dir: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const amount = 320;
    scrollRef.current.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  if (!matches.length) return null;

  return (
    <div className="border-b border-lborder bg-card/50 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="relative flex items-center gap-2 py-2">
          <button
            type="button"
            onClick={() => scroll('left')}
            className="z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-elevated/80 text-stext ring-1 ring-lborder transition-colors hover:text-mtext"
            aria-label="Scroll left"
          >
            <ChevronLeft size={14} />
          </button>

          <div ref={scrollRef} className="no-scrollbar flex flex-1 gap-2 overflow-x-auto scroll-smooth">
            {matches.map((m) => (
              <StripCard key={m.matchId || m.id} match={m} />
            ))}
          </div>

          <button
            type="button"
            onClick={() => scroll('right')}
            className="z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-elevated/80 text-stext ring-1 ring-lborder transition-colors hover:text-mtext"
            aria-label="Scroll right"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

function StripCard({ match }: { match: any }) {
  const teams = match.teams;
  const isObj = teams && typeof teams === 'object' && !Array.isArray(teams);
  const homeCode = isObj ? teams.home?.code : Array.isArray(teams) ? teams[0] : '';
  const awayCode = isObj ? teams.away?.code : Array.isArray(teams) ? teams[1] : '';
  const homeName = isObj ? teams.home?.name : match.teamNames?.[0] || homeCode;
  const awayName = isObj ? teams.away?.name : match.teamNames?.[1] || awayCode;

  const isLive = match.status === 'live';
  const isUpcoming = match.status === 'upcoming';
  const inn = match.currentInnings;
  const isHomeBatting = isLive && inn?.battingTeam === homeCode;

  let homeScore = '';
  let awayScore = '';
  if (isLive && inn) {
    const sc = match.displayScore || `${inn.runs}/${inn.wickets}`;
    const ov = inn.overs !== null ? ` (${inn.overs})` : '';
    if (isHomeBatting) homeScore = sc + ov;
    else awayScore = sc + ov;
  }

  const scheduled = match.date || match.scheduled || '';
  let dateLabel = '';
  if (scheduled && (isUpcoming || (!isLive && !match.result))) {
    const d = new Date(scheduled);
    if (!isNaN(d.getTime())) {
      dateLabel = d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' });
    }
  }

  return (
    <Link
      href={`/matches/${match.matchId || match.id}`}
      className="group flex w-[280px] shrink-0 items-center gap-3 rounded-lg bg-elevated/60 px-3 py-2 ring-1 ring-lborder/60 transition-all hover:bg-elevated hover:ring-accent/30"
    >
      <TeamBadge code={homeCode} name={homeName} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-mtext">{homeCode || 'TBD'}</span>
          {homeScore && <span className="font-mono text-[10px] font-bold text-accent2">{homeScore}</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-bold text-mtext">{awayCode || 'TBD'}</span>
          {awayScore && <span className="font-mono text-[10px] font-bold text-accent2">{awayScore}</span>}
        </div>
      </div>
      <div className="shrink-0 text-right">
        {isLive ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent2/15 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider text-accent2">
            <Radio size={8} className="animate-pulse" /> LIVE
          </span>
        ) : dateLabel ? (
          <span className="flex items-center gap-1 text-[9px] text-stext">
            <Clock size={9} />
            {dateLabel}
          </span>
        ) : (
          <span className="text-[9px] font-semibold text-stext">Upcoming</span>
        )}
      </div>
    </Link>
  );
}

function TeamBadge({ code, name }: { code: string; name: string }) {
  let hash = 0;
  const key = name || code;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);

  return (
    <span
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 text-[9px] font-black text-white"
      style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 40) % 360}, 80%, 35%))` }}
      title={name}
    >
      {getInitials(name || code)}
    </span>
  );
}
