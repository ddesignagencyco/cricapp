'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Target, Flame, Trophy, Zap } from 'lucide-react';
import Tabs from '../Tabs';
import EmptyState from '../EmptyState';
import TeamLogo from '../TeamLogo';
import { formatPlayerName } from '../../utils/helpers';
import type { LeaderEntry, LeaderGroup } from '../../types/index';

const statsTabs = [
  { key: 'batting', label: 'Batting' },
  { key: 'bowling', label: 'Bowling' },
  { key: 'fielding', label: 'Fielding' },
];

const statLabels: Record<string, string> = {
  highest_score: 'Highest Score',
  top_average: 'Batting Average',
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

const valueHeaders: Record<string, string> = {
  highest_score: 'HS',
  top_average: 'Avg',
  top_runs: 'Runs',
  top_strike_rate: 'SR',
  top_sixes: '6s',
  top_fours: '4s',
  top_fifties: '50s',
  top_hundreds: '100s',
  top_wickets: 'Wkts',
  top_economy: 'Econ',
  top_maidens: 'Mdns',
  top_dot_balls: 'Dots',
  top_catches: 'Ct',
};

interface Props {
  leaders?: LeaderGroup[];
}

export default function StatsBoard({ leaders = [] }: Props) {
  const [tab, setTab] = useState('batting');
  const grouped = leaders.filter((group) => group.category === tab);

  return (
    <>
      <div className="mb-6">
        <Tabs tabs={statsTabs} active={tab} onChange={setTab} />
      </div>

      {grouped.length > 0 ? (
        <div className="fade-in grid grid-cols-1 gap-6 pt-2 lg:grid-cols-2">
          {grouped.map((group) => (
            <LeaderSection key={`${group.category}:${group.stat}`} stat={group.stat} entries={group.entries || []} />
          ))}
        </div>
      ) : (
        <EmptyState title="No leader data" message="Season leaders will appear once data is available." />
      )}
    </>
  );
}

function LeaderSection({ stat, entries }: { stat: string; entries: LeaderEntry[] }) {
  const title = statLabels[stat] || titleCase(stat.replace(/_/g, ' '));
  const valueLabel = valueHeaders[stat] || 'Value';
  const Icon =
    stat.includes('run') || stat.includes('score')
      ? Zap
      : stat.includes('wicket') || stat.includes('maiden') || stat.includes('dot') || stat.includes('economy')
        ? Target
        : stat.includes('six') || stat.includes('four')
          ? Flame
          : Trophy;
  const rows = [...entries].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)).slice(0, 10);

  return (
    <section className="overflow-hidden rounded-2xl bg-card ring-1 ring-lborder">
      <div className="flex items-center justify-between gap-3 border-b border-lborder px-4 py-3">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-bold text-mtext sm:text-base">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand text-white">
            <Icon size={16} />
          </span>
          <span className="truncate">{title}</span>
        </h3>
        <span className="shrink-0 text-xs text-stext">Top {rows.length}</span>
      </div>

      {rows.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[320px] text-left text-sm">
            <thead>
              <tr className="border-b border-lborder text-xs uppercase tracking-wider">
                <th className="w-12 px-4 py-2.5">#</th>
                <th className="px-4 py-2.5">Player</th>
                <th className="px-4 py-2.5 text-right">{valueLabel}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const name = formatPlayerName(row.playerName);
                return (
                  <tr
                    key={row.playerId || `${stat}-${index}`}
                    className={`border-b border-lborder/60 last:border-0 transition-colors hover:bg-[var(--color-row-hover)] ${
                      index % 2 === 1 ? 'bg-card/60' : ''
                    }`}
                  >
                    <td className="px-4 py-3 align-middle font-mono">
                      <span
                        className={`grid h-6 w-6 place-items-center rounded-sm text-xs font-black ${
                          index < 3 ? 'bg-brand text-white' : 'bg-elevated text-stext'
                        }`}
                      >
                        {row.rank ?? index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Link href={`/players/${row.playerId}`} className="flex items-center gap-2.5 hover:text-accent">
                        <TeamLogo name={row.teamName} code={row.teamAbbr} size="xs" link={false} />
                        <span className="min-w-0">
                          <span className="block font-semibold text-mtext">{name}</span>
                          <span className="block text-xs text-stext">
                            {row.teamName}
                            {row.teamAbbr ? ` · ${row.teamAbbr}` : ''}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-right align-middle font-mono text-base font-bold tabular-nums text-mtext">
                      {formatStatValue(stat, row.value)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="px-4 py-8 text-center text-sm text-stext">No players in this list yet.</p>
      )}
    </section>
  );
}

function formatStatValue(stat: string, value: number | string): string {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return String(value ?? '—');
  if (stat.includes('average') || stat.includes('economy') || stat.includes('strike')) {
    return numeric.toFixed(2).replace(/\.00$/, '');
  }
  return Number.isInteger(numeric) ? String(numeric) : String(numeric);
}

function titleCase(value: string): string {
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
