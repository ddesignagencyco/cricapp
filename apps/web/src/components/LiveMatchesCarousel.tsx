'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Zap } from 'lucide-react';
import MatchCard from './MatchCard';

interface LiveMatchesCarouselProps {
  matches: any[];
  title?: string;
  subtitle?: string;
}

export default function LiveMatchesCarousel({
  matches,
  title = 'Live Matches',
  subtitle = 'Match Centre',
}: LiveMatchesCarouselProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [perView, setPerView] = useState(1);
  const count = matches.length;
  const maxIndex = Math.max(0, count - perView);
  const positionCount = Math.max(1, count - perView + 1);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const update = () => setPerView(mq.matches ? 2 : 1);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    setIndex((i) => Math.min(i, Math.max(0, count - perView)));
  }, [count, perView]);

  const step = (viewportRef.current?.offsetWidth ?? 0) / perView;

  const go = (i: number) => setIndex(Math.min(Math.max(0, i), maxIndex));

  if (count === 0) {
    return (
      <div className="rounded-2xl bg-card px-6 py-8 text-center text-stext ring-1 ring-lborder">
        No matches live right now — check back soon.
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-accent">
            <Zap size={18} strokeWidth={2.2} />
            <span className="text-xs font-semibold uppercase tracking-widest text-stext">{subtitle}</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-mtext sm:text-2xl">{title}</h2>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Link href="/matches" className="whitespace-nowrap text-sm font-semibold text-accent transition-colors hover:text-accent2">
            View all
          </Link>
          {count > perView && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Previous match"
                onClick={() => go(index - 1)}
                disabled={index === 0}
                className="grid h-8 w-8 place-items-center rounded-full bg-elevated text-mtext ring-1 ring-lborder transition-colors hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-elevated disabled:hover:text-mtext"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                aria-label="Next match"
                onClick={() => go(index + 1)}
                disabled={index === maxIndex}
                className="grid h-8 w-8 place-items-center rounded-full bg-elevated text-mtext ring-1 ring-lborder transition-colors hover:bg-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-elevated disabled:hover:text-mtext"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      <div ref={viewportRef} className="overflow-hidden">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * step}px)` }}
        >
          {matches.map((m) => (
            <div key={m.matchId} className="min-w-0 basis-full md:basis-1/2 shrink-0 p-1">
              <MatchCard match={m} />
            </div>
          ))}
        </div>
      </div>

      {count > perView && (
        <div className="mt-3 flex items-center justify-center gap-1.5">
          {Array.from({ length: positionCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Go to position ${i + 1}`}
              onClick={() => go(i)}
              className={`h-1 rounded-full transition-all ${i === index ? 'w-4 bg-accent' : 'w-1.5 bg-lborder hover:bg-stext/40'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
