'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Activity, BarChart3, Bell, Trophy } from 'lucide-react';
import { BlinkingDot } from '../LiveIndicator';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

const HIGHLIGHTS = [
  { icon: Activity, title: 'Live ball-by-ball scores', text: 'Follow every over as it happens with real-time scorecards.' },
  { icon: Trophy, title: 'PSL 2026 hub', text: 'Fixtures, standings and squads for all six franchises.' },
  { icon: BarChart3, title: 'Deep player stats', text: 'Career records, form guides and head-to-head numbers.' },
  { icon: Bell, title: 'Match reminders', text: 'Never miss a Pakistan game or a title decider again.' },
];

function BrandLockup() {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5" aria-label="PAK CRICZONE home">
      <span className="text-xl font-black tracking-tight sm:text-2xl">
        <span className="text-white">PAK CRIC</span>
        <span className="text-accent2">ZONE</span>
      </span>
    </Link>
  );
}

export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="grid min-w-0 overflow-hidden rounded-2xl bg-card ring-1 ring-lborder shadow-card-dark lg:grid-cols-2">
        {/* Visual panel */}
        <aside className="relative h-44 overflow-hidden sm:h-56 lg:h-auto lg:min-h-[640px]">
          <Image
            src="/banner2.jpg"
            alt=""
            aria-hidden="true"
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#04101d] via-[#04101d]/80 to-[#04101d]/30" />
          <div className="absolute inset-0 bg-accent/10 mix-blend-overlay" />

          <div className="relative flex h-full flex-col justify-between p-5 sm:p-7 lg:p-9">
            <div className="flex items-center justify-between gap-3">
              <BrandLockup />
              {/* Sits directly on the photo, so it keeps a legible dark surface
                  and only shares the blinking dot with the live match badges. */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white ring-1 ring-white/25 backdrop-blur-sm">
                <BlinkingDot className="text-danger" />
                Live
              </span>
            </div>

            <div className="hidden lg:block">
              <h2 className="text-3xl font-black leading-tight tracking-tight text-white">
                Every Run. Every Ball.
                <span className="block text-accent2">Live.</span>
              </h2>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/70">
                Join thousands of fans tracking Pakistan cricket and the PSL on PAK CRICZONE.
              </p>

              <ul className="mt-7 space-y-4">
                {HIGHLIGHTS.map(({ icon: Icon, title: heading, text }) => (
                  <li key={heading} className="flex gap-3">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded bg-white/10 text-accent2 ring-1 ring-white/15">
                      <Icon size={15} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-white">{heading}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-white/60">{text}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <p className="hidden text-[11px] font-semibold uppercase tracking-wider text-white/50 lg:block">
              Live scores · PSL 2026 · Teams · Player stats
            </p>
          </div>
        </aside>

        {/* Form panel */}
        <section className="flex min-w-0 flex-col justify-center p-6 sm:p-9 lg:p-12">
          <div className="mx-auto min-w-0 w-full max-w-md">
            <h1 className="text-2xl font-black tracking-tight text-mtext sm:text-3xl">{title}</h1>
            <p className="mt-2 text-xs leading-relaxed text-stext sm:text-sm">{subtitle}</p>

            <div className="mt-7">{children}</div>

            {footer && (
              <div className="mt-6 border-t border-lborder pt-5 text-center text-xs text-stext sm:text-sm">
                {footer}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
