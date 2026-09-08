'use client';

import Link from 'next/link';
import { ChevronRight, Eye } from 'lucide-react';
import { getInitials } from '../utils/helpers';

interface CricketHeroProps {
  match?: any;
}

export default function CricketHero({ match }: CricketHeroProps) {
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
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
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

          {/* Right side: player image area */}
          <div className="relative hidden lg:block">
            <div className="relative h-64 w-64 xl:h-72 xl:w-72">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent/20 to-accent2/10 blur-2xl" />
              <div className="absolute inset-4 flex items-center justify-center rounded-full bg-gradient-to-br from-accent/10 to-transparent ring-1 ring-white/10">
                <div className="text-center">
                  <p className="text-6xl font-black text-white/10">PAK</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
