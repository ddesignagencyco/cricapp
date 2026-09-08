'use client';

import Link from 'next/link';
import { Calendar, MapPin, Trophy, Users, ChevronRight } from 'lucide-react';
import { getInitials } from '../utils/helpers';

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
  return (
    <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* PSL Spotlight */}
        <div className="rounded-xl bg-card ring-1 ring-lborder overflow-hidden">
          <div className="relative h-48 overflow-hidden bg-gradient-to-br from-accent/30 via-primary to-accent2/20">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="mb-2 flex items-center justify-center gap-2">
                  <Trophy size={24} className="text-gold" />
                  <span className="text-lg font-black uppercase tracking-wider text-mtext">HBL</span>
                </div>
                <p className="text-2xl font-black uppercase tracking-wider text-accent">PSL</p>
                <p className="text-xs font-bold uppercase tracking-wider text-stext">Pakistan Super League</p>
                <p className="mt-1 text-3xl font-black text-gold">2026</p>
              </div>
            </div>
            <div className="absolute right-4 top-4 text-right">
              <p className="text-sm font-bold text-white/80">BIGGER</p>
              <p className="text-lg font-black text-white">BRIGHTER</p>
              <p className="text-sm font-bold text-white/80">TOGETHER</p>
            </div>
          </div>

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

            {nextFixture && (
              <div className="mt-4 rounded-lg bg-elevated p-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-stext">Next Fixture</p>
                <div className="flex items-center gap-3">
                  <span className="rounded bg-accent/15 px-2 py-0.5 text-[9px] font-bold uppercase text-accent">T20</span>
                  <div className="flex items-center gap-2">
                    <TeamMini code={nextFixture.homeCode} name={nextFixture.homeName} />
                    <span className="text-[10px] text-stext">vs</span>
                    <TeamMini code={nextFixture.awayCode} name={nextFixture.awayName} />
                  </div>
                  <span className="ml-auto text-[10px] text-stext">{nextFixture.date} • {nextFixture.time}</span>
                </div>
                <p className="mt-1 text-[10px] text-stext">{nextFixture.venue}</p>
              </div>
            )}

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
                {standings.length > 0 ? (
                  standings.map((row, i) => (
                    <tr
                      key={row.teamId || i}
                      className="border-b border-lborder/40 transition-colors last:border-0 hover:bg-elevated/60"
                    >
                      <td className="px-4 py-2.5 text-center font-mono text-xs text-stext">{i + 1}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <TeamMini code={row.teamAbbr || ''} name={row.teamName || ''} />
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

function TeamMini({ code, name }: { code: string; name: string }) {
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);

  return (
    <span
      className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/10 text-[8px] font-black text-white"
      style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 40) % 360}, 80%, 35%))` }}
      title={name}
    >
      {getInitials(name || code)}
    </span>
  );
}
