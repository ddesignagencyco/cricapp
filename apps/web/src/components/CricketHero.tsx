'use client';

import Link from 'next/link';
import { ChevronRight, Eye, Trophy, Users, Newspaper, Calendar, TrendingUp } from 'lucide-react';

interface CricketHeroProps {
  match?: any;
}

export default function CricketHero({ match: _match }: CricketHeroProps) {
  return (
    <section className="hero-grad-home relative flex min-h-[420px] items-center overflow-hidden sm:min-h-[500px]">
      {/* Animated background blobs */}
      <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-accent/20 blur-[120px] animate-pulse" />
      <div className="absolute -bottom-20 -right-20 h-80 w-80 rounded-full bg-accent2/15 blur-[100px] animate-pulse delay-1000" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-64 w-64 rounded-full bg-gold/10 blur-[80px] animate-pulse delay-500" />

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-black/40" />

      <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20 w-full">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
          {/* Left content */}
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-widest text-white shadow-sm backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-accent2 live-pulse" />
              LIVE CRICKET
            </span>

            <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-white sm:text-5xl lg:text-6xl">
              EVERY BALL{' '}
              <span className="text-accent relative">
                . LIVE
                <span className="absolute -bottom-1 left-0 h-1 w-full bg-gradient-to-r from-accent to-accent2 rounded-full" />
              </span>
            </h1>

            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70 sm:text-lg">
              From the first ball to the final over, experience every moment that makes cricket
              unforgettable.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/matches"
                className="group inline-flex items-center gap-2.5 rounded-xl bg-accent px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-accent/30 transition-all hover:bg-accent2 hover:shadow-xl hover:shadow-accent/40 hover:-translate-y-0.5"
              >
                <Eye size={17} />
                View Matches
                <ChevronRight size={17} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/teams"
                className="inline-flex items-center gap-2.5 rounded-xl bg-white/10 px-7 py-3.5 text-sm font-bold text-white ring-1 ring-white/25 backdrop-blur-sm transition-all hover:bg-white/20 hover:-translate-y-0.5"
              >
                <Users size={17} />
                Explore Teams
              </Link>
            </div>
          </div>

          {/* Right — Quick links grid */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 w-full max-w-xs sm:max-w-sm lg:max-w-xs">
            {[
              { icon: Calendar, label: 'Schedule', sub: 'Fixtures & Results', href: '/schedules', color: 'from-accent/20 to-accent/5', iconColor: 'text-accent' },
              { icon: Trophy, label: 'PSL 2026', sub: 'Points Table & More', href: '/psl', color: 'from-accent2/20 to-accent2/5', iconColor: 'text-accent2' },
              { icon: Newspaper, label: 'News', sub: 'Latest Stories', href: '/news', color: 'from-gold/20 to-gold/5', iconColor: 'text-gold' },
              { icon: TrendingUp, label: 'Rankings', sub: 'Top Players', href: '/players', color: 'from-green-500/20 to-green-500/5', iconColor: 'text-green-400' },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="group flex flex-col items-start gap-2 rounded-xl bg-white/5 p-4 ring-1 ring-white/10 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-white/10 hover:ring-white/25 hover:shadow-lg"
              >
                <div className={`grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br ${item.color}`}>
                  <item.icon size={18} className={item.iconColor} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white group-hover:text-accent transition-colors">{item.label}</p>
                  <p className="text-[11px] text-white/50">{item.sub}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
