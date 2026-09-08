'use client';

import Link from 'next/link';
import { ChevronRight, Eye, Play } from 'lucide-react';

interface CricketHeroProps {
  match?: any;
}

export default function CricketHero({ match }: CricketHeroProps) {
  void match;

  return (
    <section className="hero-grad-home relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-sm backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-accent2 live-pulse" />
              LIVE CRICKET
            </span>

            <h1 className="mt-4 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl">
              EVERY BALL <span className="text-accent">. LIVE</span>
            </h1>

            <p className="mt-3 max-w-xl text-base leading-relaxed text-white/80">
              From the first ball to the final over, experience every moment that makes cricket
              unforgettable. Follow live scores, upcoming fixtures, teams, tournaments, player
              statistics, and the latest stories&mdash;all in one place.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link
                href="/matches"
                className="group inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-bold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent2"
              >
                <Eye size={16} />
                View Matches
                <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/teams"
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-6 py-3 text-sm font-bold text-white ring-1 ring-white/25 backdrop-blur-sm transition-colors hover:bg-white/20"
              >
                <Play size={16} />
                Explore Teams
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}