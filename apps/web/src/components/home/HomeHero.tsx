'use client';

import Link from 'next/link';
import { ChevronRight, Eye } from 'lucide-react';

interface HomeHeroProps {
  match?: any;
}

export default function HomeHero({ match }: HomeHeroProps) {
  const teams = match?.teams;
  const isObj = teams && typeof teams === 'object' && !Array.isArray(teams);
  const home = isObj ? teams.home : null;
  const away = isObj ? teams.away : null;
  const homeName = home?.name || 'Pakistan';
  const awayName = away?.name || 'South Africa';
  const homeCode = home?.code || 'PAK';
  const awayCode = away?.code || 'SA';

  const venue = match?.venue || 'National Stadium, Karachi';
  const scheduled = match?.scheduled || match?.date;
  const matchNum = match?.matchNumber || '2nd Test';

  let dateStr = '';
  let timeStr = '';
  if (scheduled) {
    const d = new Date(scheduled);
    if (!isNaN(d.getTime())) {
      dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
  }

  return (
    <section className="hero-grad-home relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/85 via-black/65 to-black/35" />

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:py-20">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-sm backdrop-blur-md">
            <span className="h-1.5 w-1.5 rounded-full bg-accent2 live-pulse" />
            NEXT MATCH
          </span>

          <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
            EVERY BALL. <span className="text-accent">LIVE.</span>
          </h1>

          <p className="mt-3 text-lg font-bold text-white/90 sm:text-xl">
            {homeName} vs {awayName}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-white/70">
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-white/50" />
              {matchNum}
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-white/50" />
              {venue}
            </span>
            {dateStr && (
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-white/50" />
                {dateStr}
              </span>
            )}
            {timeStr && (
              <span className="flex items-center gap-1.5">
                <span className="h-1 w-1 rounded-full bg-white/50" />
                {timeStr} PKT
              </span>
            )}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/matches"
              className="group inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-bold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent2"
            >
              <Eye size={16} />
              View Match Center
              <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/teams"
              className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-6 py-3 text-sm font-bold text-white ring-1 ring-white/25 backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              Explore Teams
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
