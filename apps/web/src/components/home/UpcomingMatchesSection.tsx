'use client';

import Link from 'next/link';
import { Calendar, Clock, MapPin, ChevronRight } from 'lucide-react';
import { getInitials } from '../../utils/helpers';

interface UpcomingMatchesSectionProps {
  matches: any[];
}

export default function UpcomingMatchesSection({ matches }: UpcomingMatchesSectionProps) {
  if (!matches.length) return null;

  return (
    <section className="mx-auto max-w-7xl px-4 pb-10 sm:px-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <h2 className="text-xl font-bold tracking-tight text-mtext sm:text-2xl">Upcoming Matches</h2>
        <Link
          href="/matches"
          className="shrink-0 whitespace-nowrap text-sm font-semibold text-accent transition-colors hover:text-accent2"
        >
          View all matches
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {matches.map((m: any) => (
          <UpcomingCard key={m.matchId || m.id} match={m} />
        ))}
      </div>
    </section>
  );
}

function UpcomingCard({ match }: { match: any }) {
  const teams = match.teams;
  const isObj = teams && typeof teams === 'object' && !Array.isArray(teams);
  const home = isObj ? teams.home : null;
  const away = isObj ? teams.away : null;
  const homeCode = home?.code || (Array.isArray(teams) ? teams[0] : '');
  const awayCode = away?.code || (Array.isArray(teams) ? teams[1] : '');
  const homeName = home?.name || homeCode;
  const awayName = away?.name || awayCode;

  const tournament = match.tournament || match.tournamentName || 'Cricket';
  const matchNum = match.matchNumber || '';
  const venue = match.venue || '';
  const scheduled = match.scheduled || match.date || '';
  const date = scheduled ? new Date(scheduled) : null;
  const dateStr = date && !isNaN(date.getTime())
    ? date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })
    : '';
  const timeStr = date && !isNaN(date.getTime())
    ? date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '';

  return (
    <Link
      href={`/matches/${match.matchId || match.id}`}
      className="group flex flex-col overflow-hidden rounded-xl bg-card p-4 ring-1 ring-lborder transition-all duration-300 hover:-translate-y-0.5 hover:bg-elevated hover:ring-accent/30"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-[10px] font-bold uppercase tracking-wider text-stext">
          {tournament}
        </span>
        <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">
          {matchNum || 'Upcoming'}
        </span>
      </div>

      <div className="space-y-2.5">
        <TeamRow code={homeCode} name={homeName} />
        <div className="ml-5 border-l-2 border-lborder pl-3">
          <TeamRow code={awayCode} name={awayName} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-lborder/50 pt-2.5 text-[10px] text-stext">
        {dateStr && (
          <span className="flex items-center gap-1">
            <Calendar size={10} className="text-accent/70" />
            {dateStr}
          </span>
        )}
        {timeStr && (
          <span className="flex items-center gap-1">
            <Clock size={10} className="text-accent/70" />
            {timeStr}
          </span>
        )}
        {venue && (
          <span className="flex min-w-0 items-center gap-1">
            <MapPin size={10} className="shrink-0 text-accent/70" />
            <span className="truncate">{venue.split(',')[0]}</span>
          </span>
        )}
      </div>
    </Link>
  );
}

function TeamRow({ code, name }: { code: string; name: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <TeamMini code={code} name={name} />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-mtext">{name}</span>
    </div>
  );
}

function TeamMini({ code, name }: { code: string; name: string }) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);

  return (
    <span
      className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 text-[10px] font-black text-white"
      style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 40) % 360}, 80%, 35%))` }}
      title={name}
    >
      {getInitials(name || code)}
    </span>
  );
}
