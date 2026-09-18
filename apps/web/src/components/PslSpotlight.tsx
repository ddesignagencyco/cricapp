'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Calendar, MapPin, Users, ChevronRight, TrendingUp } from 'lucide-react';
import TeamLogo from './TeamLogo';
import DummyAd from './advertisements/DummyAd';

interface PslSpotlightProps {
  standings?: any[];
}

const PSL_DATA = {
  season: 'PSL 2026',
  dates: 'Mar 11 - Apr 18, 2026',
  teams: 6,
  venues: 4,
  description:
    'The biggest cricketing festival in Pakistan returns with more thrills, bigger rivalries and world-class talent.',
};

export default function PslSpotlight({ standings = [] }: PslSpotlightProps) {
  const rows = standings.slice(0, 5);
  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
      <div className="space-y-4">
        {/* PSL Spotlight */}
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-lborder">
          <div className="relative overflow-hidden">
            <Image
              src="/banner2.png"
              alt="HBL PSL 2026 — Bigger. Brighter. Together."
              width={2103}
              height={748}
              sizes="100vw"
              className="h-auto w-full object-contain"
              priority
            />
          </div>

          <div className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-stext">
                <span className="flex items-center gap-1.5">
                  <Calendar size={12} className="text-accent" />
                  {PSL_DATA.dates}
                </span>
                <span className="flex items-center gap-1.5">
                  <Users size={12} className="text-accent" />
                  {PSL_DATA.teams} Teams
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin size={12} className="text-accent" />
                  {PSL_DATA.venues} Venues
                </span>
              </div>

              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-stext">{PSL_DATA.description}</p>
            </div>

            <Link
              href="/psl"
              className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg bg-accent/10 px-4 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20 lg:self-auto"
            >
              View tournament <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* PSL Points Table */}
        <div className="grid min-w-0 grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8">
        <div className="min-w-0 overflow-hidden rounded-2xl bg-card ring-1 ring-lborder">
          <div className="flex items-center justify-between border-b border-lborder px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-accent" />
              <h3 className="text-sm font-bold text-mtext">Points Table</h3>
            </div>
            <Link href="/psl" className="text-xs font-bold uppercase tracking-wide text-accent">
              Full table
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-lborder text-xs uppercase tracking-wider text-stext">
                  <th className="px-4 py-2.5 text-center">#</th>
                  <th className="px-4 py-2.5">Team</th>
                  <th className="px-4 py-2.5 text-center">P</th>
                  <th className="px-4 py-2.5 text-center">W</th>
                  <th className="px-4 py-2.5 text-center">L</th>
                  <th className="px-4 py-2.5 text-center">NRR</th>
                  <th className="px-4 py-2.5 text-center">PTS</th>
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 ? (
                  rows.map((row, i) => (
                    <tr
                      key={row.teamId || i}
                      className="border-b border-lborder transition-colors last:border-0 hover:bg-[var(--color-row-hover)]"
                    >
                      <td className="px-4 py-2.5 text-center font-mono text-sm font-medium tabular-nums text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <TeamLogo teamId={row.teamId} name={row.teamName} code={row.teamAbbr} size="md" link={false} />
                          <span className="text-sm font-semibold text-mtext">{row.teamName}</span>
                          <span className="text-xs font-medium uppercase text-muted-foreground">{row.teamAbbr}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono text-sm font-medium tabular-nums text-stext">{row.played ?? 0}</td>
                      <td className="px-4 py-2.5 text-center font-mono text-sm font-semibold tabular-nums text-accent">{row.won ?? 0}</td>
                      <td className="px-4 py-2.5 text-center font-mono text-sm font-medium tabular-nums text-danger">{row.lost ?? 0}</td>
                      <td className={`px-4 py-2.5 text-center font-mono text-sm font-semibold tabular-nums ${(row.netRunRate ?? 0) >= 0 ? 'text-accent' : 'text-danger'}`}>
                        {row.netRunRate ?? 0}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono text-sm font-semibold tabular-nums text-mtext">{row.points ?? 0}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-xs text-stext">
                      No standings data available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
          <div className="flex justify-center lg:justify-start">
            <DummyAd size="medium-rectangle" placement="home-sidebar" />
          </div>
        </div>
      </div>
    </section>
  );
}
