'use client';

import Link from 'next/link';
import { Calendar, MapPin, Trophy, Users, ChevronRight } from 'lucide-react';
import ColorIcon from './ColorIcon';
import TeamLogo from './TeamLogo';

interface PslSpotlightProps {
  standings?: any[];
  nextFixture?: any;
}

const PSL_DATA = {
  season: 'PSL 2026',
  dates: 'Mar 11 - Apr 18, 2026',
  teams: 6,
  venues: 4,
  description:
    'The biggest cricketing festival in Pakistan returns with more thrills, bigger rivalries and world-class talent.',
};

export default function PslSpotlight({ standings = [], nextFixture }: PslSpotlightProps) {
  const rows = standings.slice(0, 5);
  return (
    <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* PSL Spotlight */}
        <div className="rounded-xl bg-card ring-1 ring-lborder overflow-hidden">


          <div className="p-5">
            <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold text-stext">
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

            <p className="mt-3 text-sm leading-relaxed text-stext">{PSL_DATA.description}</p>

            <div className="mt-4 overflow-hidden rounded-lg ring-1 ring-lborder">
              <img
                src="/banner2.png"
                alt="PSL 2026"
                className="h-44 w-full object-cover"
                loading="lazy"
              />
            </div>

            <Link
              href="/psl"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-accent transition-colors hover:text-accent2"
            >
              View tournament <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* PSL Points Table */}
        <div className="rounded-xl bg-card ring-1 ring-lborder overflow-hidden">
          <div className="flex items-center justify-between border-b border-lborder px-5 py-3">
            <h3 className="text-sm font-bold text-mtext">PSL 2026 Points Table</h3>
            <Link
              href="/points-table"
              className="text-xs font-semibold text-accent transition-colors hover:text-accent2"
            >
              View full table &rarr;
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
                      <td className="px-4 py-2.5 text-center font-mono text-xs text-danger">{row.lost ?? 0}</td>
                      <td className={`px-4 py-2.5 text-center font-mono text-xs ${(row.netRunRate ?? 0) >= 0 ? 'text-accent2' : 'text-danger'}`}>
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
