'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Flame, Target, Zap } from 'lucide-react';
import { getInitials } from '../utils/helpers';

const statMeta: Record<string, { label: string; tone: string }> = {
  top_runs: { label: 'Most Runs', tone: 'text-accent' },
  top_wickets: { label: 'Most Wickets', tone: 'text-accent2' },
  top_sixes: { label: 'Most Sixes', tone: 'text-gold' },
  top_fours: { label: 'Most Fours', tone: 'text-accent2' },
};

const filterTabs = ['All', 'Test', 'ODI', 'T20'];

export function LeaderPanel({ group }: { group: any }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const meta = statMeta[group.stat] || { label: group.stat.replace(/_/g, ' '), tone: 'text-accent' };
  const StatIcon = group.stat.includes('wicket') || group.stat.includes('maiden') || group.stat.includes('dot')
    ? Target : group.stat.includes('six') || group.stat.includes('four') ? Flame : Zap;
  const entries = [...(group.entries || [])]
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    .slice(0, 5);

  const isBowling = group.stat.includes('wicket');

  return (
    <div className="rounded-xl bg-card ring-1 ring-lborder overflow-hidden">
      <div className="flex items-center justify-between border-b border-lborder px-5 py-3">
        <div className="flex items-center gap-2">
          <StatIcon size={15} className="text-accent2" />
          <h3 className="text-sm font-bold text-mtext">{meta.label}</h3>
        </div>
        <div className="flex items-center gap-1">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveFilter(tab)}
              className={`rounded-md px-2.5 py-1 text-[10px] font-bold transition-colors ${
                activeFilter === tab
                  ? 'bg-accent text-white'
                  : 'text-stext hover:bg-elevated hover:text-mtext'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-lborder text-[10px] uppercase tracking-wider text-stext">
              <th className="px-4 py-2 text-center">#</th>
              <th className="px-4 py-2">Player</th>
              <th className="px-4 py-2">Team</th>
              <th className="px-4 py-2 text-center">M</th>
              <th className="px-4 py-2 text-center">Inns</th>
              <th className="px-4 py-2 text-center">{isBowling ? 'Wkts' : 'Runs'}</th>
              <th className="px-4 py-2 text-center">{isBowling ? 'Econ' : 'SR'}</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((row, i) => (
              <Link
                key={row.playerId || i}
                href={`/players/${row.playerId}`}
                className="contents"
              >
                <tr className="border-b border-lborder/30 transition-colors last:border-0 hover:bg-elevated/60 cursor-pointer">
                  <td className="px-4 py-2.5 text-center font-mono text-xs text-stext">{i + 1}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2.5">
                      <PlayerAvatar name={row.playerName} />
                      <span className="text-xs font-semibold text-mtext">{row.playerName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] font-bold uppercase text-stext">{row.teamAbbr}</span>
                  </td>
                  <td className="px-4 py-2.5 text-center font-mono text-xs text-stext">{row.matches ?? '—'}</td>
                  <td className="px-4 py-2.5 text-center font-mono text-xs text-stext">{row.innings ?? '—'}</td>
                  <td className={`px-4 py-2.5 text-center font-mono text-xs font-bold ${meta.tone}`}>
                    {row.value}
                  </td>
                  <td className="px-4 py-2.5 text-center font-mono text-xs text-stext">{row.rate ?? '—'}</td>
                </tr>
              </Link>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border-t border-lborder px-5 py-2.5">
        <Link
          href="/stats"
          className="inline-flex items-center gap-1 text-xs font-semibold text-accent transition-colors hover:text-accent2"
        >
          View all <ChevronRight size={13} />
        </Link>
      </div>
    </div>
  );
}

function PlayerAvatar({ name }: { name: string }) {
  return (
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-elevated text-[9px] font-bold text-accent ring-1 ring-lborder">
      {getInitials(name)}
    </span>
  );
}
