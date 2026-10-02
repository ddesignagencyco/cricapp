'use client';

import Link from 'next/link';
import { ChevronRight, Eye, Trophy, Users, Newspaper, Calendar, TrendingUp } from 'lucide-react';

interface CricketHeroProps {
  match?: any;
}

export default function CricketHero({ match: _match }: CricketHeroProps) {
  return (
    <section className="hero-grad-home relative flex min-h-[300px] items-center overflow-hidden sm:min-h-[360px]">
      <div className="hero-scrim pointer-events-none absolute inset-0" />

      <div className="relative mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          {/* Left content */}
          <div className="max-w-2xl">
            <h1 className="hero-title text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              EVERY BALL{' '}
              <span className="text-danger relative">
                . LIVE
              </span>
            </h1>

            <p className="hero-lead mt-4 max-w-xl text-base leading-relaxed sm:text-lg">
              From the first ball to the final over, experience every moment that makes cricket
              unforgettable.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/matches"
                className="btn-brand on-media group inline-flex items-center gap-2.5 rounded-md px-7 py-3.5 text-sm font-semibold"
              >
                <Eye size={17} aria-hidden="true" />
                View Matches
                <ChevronRight size={17} aria-hidden="true" className="transition-transform duration-150 group-hover:translate-x-1" />
              </Link>
              <Link
                href="/teams"
                className="btn-on-media on-media inline-flex items-center gap-2.5 rounded-md px-7 py-3.5 text-sm font-semibold ring-1 ring-white/25"
              >
                <Users size={17} aria-hidden="true" />
                Explore Teams
              </Link>
            </div>
          </div>

          {/* Right — Quick links grid */}
          <div className="grid w-full max-w-xs grid-cols-1 gap-3 sm:max-w-sm sm:grid-cols-2 sm:gap-4 lg:max-w-xs">
            {[
              { icon: Calendar, label: 'Schedule', sub: 'Fixtures & Results', href: '/schedules' },
              { icon: Trophy, label: 'PSL 2026', sub: 'Points Table & More', href: '/psl' },
              { icon: Newspaper, label: 'News', sub: 'Latest Stories', href: '/news' },
              { icon: TrendingUp, label: 'Rankings', sub: 'Top Players', href: '/players' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="hero-tile on-media group flex flex-col items-start gap-2 rounded-md p-4 ring-1 ring-white/15 transition-colors duration-150 hover:ring-white/30"
              >
                <div className="grid h-9 w-9 place-items-center rounded-md bg-white/10">
                  <item.icon size={18} aria-hidden="true" className="text-on-media-accent" />
                </div>
                <div>
                  <p className="group-hover:text-on-media-accent text-sm font-semibold text-white transition-colors duration-150">{item.label}</p>
                  <p className="text-on-media-muted text-xs font-medium">{item.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
