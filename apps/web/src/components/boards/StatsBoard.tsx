'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BarChart3, Target, Flame, Gauge, Trophy, Zap } from 'lucide-react';
import Tabs from '../Tabs';
import EmptyState from '../EmptyState';

const statsTabs = [
  { key: 'batting', label: 'Batting' },
  { key: 'bowling', label: 'Bowling' },
  { key: 'fielding', label: 'Fielding' },
];

const statLabels: Record<string, string> = {
  top_runs: 'Most Runs',
  top_strike_rate: 'Best Strike Rate',
  top_sixes: 'Most Sixes',
  top_fours: 'Most Fours',
  top_fifties: 'Most Fifties',
  top_hundreds: 'Most Hundreds',
  top_wickets: 'Most Wickets',
  top_economy: 'Best Economy',
  top_maidens: 'Most Maidens',
  top_dot_balls: 'Most Dot Balls',
  top_catches: 'Most Catches',
};

interface Props {
  leaders?: any[];
}

export default function StatsBoard({ leaders = [] }: Props) {
  const [tab, setTab] = useState('batting');

  const grouped = leaders.filter((g) => g.category === tab);

  return (
    <>
      <header className="mb-8">
        <div className="flex items-center gap-2 text-accent">
          <BarChart3 size={18} />
          <span className="text-xs font-bold uppercase tracking-widest text-stext">
            PSL Season Leaders
          </span>
        </div>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Statistics</h1>
        <p className="mt-2 max-w-2xl text-sm text-stext">
          The best of the season — runs, wickets, strike rates and more across every franchise.
        </p>
      </header>

      <div className="mb-6">
        <Tabs tabs={statsTabs} active={tab} onChange={setTab} />
      </div>

      {grouped.length > 0 ? (
        <div className="fade-in grid grid-cols-1 gap-8 pt-4 lg:grid-cols-2">
          {grouped.map((g) => (
            <LeaderSection key={g.stat} stat={g.stat} entries={g.entries || []} />
          ))}
        </div>
      ) : (
        <EmptyState title="No leader data" message="Season leaders will appear once data is available." />
      )}
    </>
  );
}

function LeaderSection({ stat, entries }: { stat: string; entries: any[] }) {
  const title = capFirst(statLabels[stat] || stat.replace(/_/g, ' '));
  const Icon = stat.includes('runs') ? Zap : stat.includes('wicket') || stat.includes('maiden') || stat.includes('dot') ? Target : stat.includes('six') || stat.includes('four') ? Flame : Trophy;
  const rows = [...entries].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)).slice(0, 10);
  const leader = rows[0];
  const medals = ['text-gold', 'text-stext', 'text-[#CD7F32]'];

  return (
    <section>
      <div className="mb-3 flex items-end justify-between gap-3">
        <h3 className="flex items-center gap-2 text-lg font-bold text-mtext">
          <span className="grid h-8 w-8 place-items-center rounded-sm bg-accent/10 text-accent">
            <Icon size={16} />
          </span>
          {title}
        </h3>
        {leader && (
          <span className="text-xs text-stext">Top {Math.min(rows.length, 10)}</span>
        )}
      </div>

      {leader && (
        <div className="mb-4 flex items-center justify-between gap-4 rounded-sm bg-gradient-to-r from-accent/15 to-transparent px-5 py-4 ring-1 ring-inset ring-accent/20">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent/15 text-sm font-black text-accent">
              <span className="truncate">
                {initials(leader.playerName || leader.teamAbbr || '?')}
              </span>
            </span>
            <div className="min-w-0">
              <p className="truncate font-bold text-mtext sm:text-lg">{leader.playerName}</p>
              <p className="text-xs text-stext">
                {leader.teamName} {leader.teamAbbr ? `· ${leader.teamAbbr}` : ''}
              </p>
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="font-mono text-2xl font-black tabular-nums text-accent">{leader.value}</p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stext">Leader</p>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-sm bg-card ring-1 ring-lborder">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-lborder bg-secondary/40 text-[11px] uppercase tracking-wider text-stext">
              <th className="px-4 py-2.5">#</th>
              <th className="px-4 py-2.5">Player</th>
              <th className="px-4 py-2.5 text-right">Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.playerId || i}
                className="border-b border-lborder/60 last:border-0 transition-colors hover:bg-elevated/60"
              >
                <td className="px-4 py-2.5 align-middle font-mono">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-sm text-[11px] font-black ${
                      i < 3 ? `bg-accent/15 text-accent` : 'bg-elevated text-stext'
                    }`}
                  >
                    {i + 1}
                  </span>
                </td>
                <td className="px-4 py-2.5 align-middle">
                  <Link href={`/players/${row.playerId}`} className="hover:text-accent">
                    <span className="font-bold text-mtext">{row.playerName}</span>
                    <span className="block text-xs text-stext">
                      {row.teamName} ({row.teamAbbr})
                    </span>
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-right align-middle font-mono text-base font-bold tabular-nums text-mtext">
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function capFirst(s: string) {
  const str = s.trim();
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

function initials(name: string) {
  return (name || '')
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}
