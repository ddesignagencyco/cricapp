'use client';

import Link from 'next/link';
import { Calendar, MapPin, Users, ChevronRight, Trophy, TrendingUp } from 'lucide-react';
import TeamLogo from './TeamLogo';

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
    <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        {/* PSL Spotlight */}
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-lborder">
          <div className="relative overflow-hidden">
            <img
              src="/banner2.png"
              alt="PSL 2026"
              className="h-44 w-full object-cover sm:h-52"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 p-4 sm:p-5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                <Trophy size={11} />
                Pakistan Super League
              </span>
              <h3 className="mt-2 text-xl font-black text-white sm:text-2xl">{PSL_DATA.season}</h3>
            </div>
          </div>

          <div className="p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-bold text-stext">
              <span className="flex items-center gap-1.5">
                <Calendar size={12} className="text-accent/70" />
                {PSL_DATA.dates}
              </span>
              <span className="flex items-center gap-1.5">
                <Users size={12} className="text-accent/70" />
                {PSL_DATA.teams} Teams
              </span>
              <span className="flex items-center gap-1.5">
                <MapPin size={12} className="text-accent/70" />
                {PSL_DATA.venues} Venues
              </span>
            </div>

            <p className="mt-3 max-w-xl text-sm leading-relaxed text-stext">{PSL_DATA.description}</p>

            <div className="mt-4">
              <Link
                href="/psl"
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent/10 px-4 py-2 text-xs font-semibold text-accent transition-colors hover:bg-accent/20"
              >
                View tournament <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* PSL Points Table */}
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-lborder">
          <div className="flex items-center justify-between border-b border-lborder px-4 py-3 sm:px-5">
            <div className="flex items-center gap-2">
              <TrendingUp size={15} className="text-accent" />
              <h3 className="text-sm font-bold text-mtext">Points Table</h3>
            </div>
            <Link href="/psl" className="text-[10px] font-bold uppercase tracking-wide text-accent hover:text-accent2">
              Full table
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-lborder text-[10px] uppercase tracking-wider text-stext">
                  <th className="px-4 py-2.5 text-center">#</th>
                  <th className="px-4 py-2.5">Team</th>
                  <th className="px-4 py-2.5 text-center">P</th>
                  <th className="px-4 py-2.5 text-center">W</th>
                  <th className="hidden px-4 py-2.5 text-center sm:table-cell">L</th>
                  <th className="hidden px-4 py-2.5 text-center sm:table-cell">NRR</th>
                  <th className="px-4 py-2.5 text-center">PTS</th>
                </tr>
              </thead>
              <tbody>
                {rows.length > 0 ? (
                  rows.map((row, i) => (
                    <tr
                      key={row.teamId || i}
                      className="border-b border-lborder/40 transition-colors last:border-0 hover:bg-elevated/60"
                    >
                      <td className="px-4 py-2.5 text-center font-mono text-xs text-stext">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <TeamLogo teamId={row.teamId} name={row.teamName} code={row.teamAbbr} size="md" link={false} />
                          <span className="text-xs font-semibold text-mtext">{row.teamName}</span>
                          <span className="text-[10px] uppercase text-stext">{row.teamAbbr}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono text-xs text-stext">{row.played ?? 0}</td>
                      <td className="px-4 py-2.5 text-center font-mono text-xs text-accent2">{row.won ?? 0}</td>
                      <td className="hidden px-4 py-2.5 text-center font-mono text-xs text-danger sm:table-cell">{row.lost ?? 0}</td>
                      <td className={`hidden px-4 py-2.5 text-center font-mono text-xs sm:table-cell ${(row.netRunRate ?? 0) >= 0 ? 'text-accent2' : 'text-danger'}`}>
                        {row.netRunRate ?? 0}
                      </td>
                      <td className="px-4 py-2.5 text-center font-mono text-xs font-bold text-mtext">{row.points ?? 0}</td>
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
      </div>
    </section>
  );
}
