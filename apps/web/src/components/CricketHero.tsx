'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Play } from 'lucide-react';

export default function CricketHero() {
  const ballRef = useRef<HTMLSpanElement>(null);
  const pos = useRef({ x: 0, y: 0 });
  const target = useRef({ x: 0, y: 0 });
  const [active, setActive] = useState(false);

  useEffect(() => {
    let raf: number;
    const tick = () => {
      const b = ballRef.current;
      if (b) {
        pos.current.x += (target.current.x - pos.current.x) * 0.14;
        pos.current.y += (target.current.y - pos.current.y) * 0.14;
        b.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const onMove = (e: React.MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    target.current.x = e.clientX - r.left - 18;
    target.current.y = e.clientY - r.top - 18;
    setActive(true);
  };

  return (
    <section
      className="hero-grad-home relative overflow-hidden"
      onMouseMove={onMove}
      onMouseLeave={() => setActive(false)}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/30" />
      <div className="pointer-events-none absolute -right-20 -top-24 h-96 w-96 rounded-full bg-accent/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-accent2/15 blur-3xl" />

      <CursorBall ref={ballRef} active={active} />

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-accent/15 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-accent ring-1 ring-accent/30">
            <span className="h-1.5 w-1.5 rounded-full bg-accent2" />
            Live Cricket Coverage
          </span>

          <h1 className="hero-title mt-5 text-4xl font-black leading-tight tracking-tight sm:text-6xl">
            EVERY BALL. <span className="text-accent">LIVE.</span>
          </h1>
          <p className="hero-lead mt-4 max-w-xl text-base leading-relaxed sm:text-lg">
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

const CursorBall = ({ ref: ballRef, active }: { ref: React.RefObject<HTMLSpanElement | null>; active: boolean }) => {
  return (
    <span
      ref={ballRef}
      className={`pointer-events-none absolute left-0 top-0 z-30 h-9 w-9 transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-0'}`}
    >
      <span className="block h-full w-full rounded-full bg-gradient-to-br from-red-400 via-red-600 to-red-800 shadow-[0_4px_18px_rgba(0,0,0,0.5)] ring-1 ring-white/20">
        <span className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 rounded bg-red-900/70" />
        <span className="absolute left-[24%] top-1/2 h-[2px] w-[42%] -translate-y-1/2 rounded bg-red-900/50" />
        <span className="absolute left-[38%] top-[10%] h-[6px] w-[20%] rounded-full bg-white/50 blur-[1px]" />
      </span>
    </span>
  );
};
