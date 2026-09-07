'use client';

import Link from 'next/link';
import { ChevronRight, Play } from 'lucide-react';

export default function CricketHero() {
  return (
    <section className="hero-grad-home relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-black/30" />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-widest text-white shadow-sm backdrop-blur-md">
            Live Cricket Coverage
          </span>

          <h1 className="mt-5 text-4xl font-black leading-tight tracking-tight text-white sm:text-6xl drop-shadow-md">
            EVERY BALL. <span className="text-accent drop-shadow-sm">LIVE.</span>
          </h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg drop-shadow-sm">
            Follow every delivery, boundary and wicket in real time. Live scores, PSL fixtures,
            teams and player statistics — all in one place.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/matches"
              className="group inline-flex items-center gap-2 rounded-sm bg-accent px-6 py-3 text-sm font-bold text-white shadow-lg shadow-accent/30 transition-colors hover:bg-accent2"
            >
              <Play size={16} />
              Watch Live
              <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/teams"
              className="inline-flex items-center gap-2 rounded-sm bg-white/10 px-6 py-3 text-sm font-bold text-white ring-1 ring-white/25 backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              Explore Teams
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
