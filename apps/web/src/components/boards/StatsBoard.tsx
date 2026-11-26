'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Target, Flame, Trophy, Zap } from 'lucide-react';
import Tabs from '../Tabs';
import EmptyState from '../EmptyState';
import TeamLogo from '../TeamLogo';
import PersonAvatar from '../PersonAvatar';
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
  top_wickets: 'Wickets',
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

  // Index each stat group by playerId so flagship tables (Most Runs, Most Wickets)
  // can display complete multi-column stats (Avg, HS, 4s, 6s, 50/100, Econ, Mdns).
  const lookup = (statName: string) => {
    const map = new Map<string, number | string>();
    const group = grouped.find((g) => g.stat === statName);
    for (const entry of group?.entries || []) {
      if (entry.playerId) map.set(entry.playerId, entry.value);
    }
    return map;
  };

  const statMaps = {
    avg: lookup('top_average'),
    hs: lookup('highest_score'),
    fours: lookup('top_fours'),
    sixes: lookup('top_sixes'),
    fifties: lookup('top_fifties'),
    hundreds: lookup('top_hundreds'),
    sr: lookup('top_strike_rate'),
    econ: lookup('top_economy'),
    maidens: lookup('top_maidens'),
  };

  return (
    <>
      <div className="mb-6">
        <Tabs tabs={statsTabs} active={tab} onChange={setTab} />
      </div>

      {grouped.length > 0 ? (
        <div className="fade-in grid grid-cols-1 gap-6 pt-2 lg:grid-cols-2">
          {grouped.map((group) => (
            <LeaderSection
              key={`${group.category}:${group.stat}`}
              stat={group.stat}
              entries={group.entries || []}
              statMaps={statMaps}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="No leader data" message="Season leaders will appear once data is available." />
      )}
    </>
  );
}

type StatMaps = {
  avg: Map<string, number | string>;
  hs: Map<string, number | string>;
  fours: Map<string, number | string>;
  sixes: Map<string, number | string>;
  fifties: Map<string, number | string>;
  hundreds: Map<string, number | string>;
  sr: Map<string, number | string>;
  econ: Map<string, number | string>;
  maidens: Map<string, number | string>;
};

function LeaderSection({ stat, entries, statMaps }: { stat: string; entries: LeaderEntry[]; statMaps: StatMaps }) {
  const title = statLabels[stat] || titleCase(stat.replace(/_/g, ' '));
  const valueLabel = valueHeaders[stat] || 'Value';
  const isDetailedRuns = stat === 'top_runs';
  const isDetailedWickets = stat === 'top_wickets';
  const isWide = isDetailedRuns || isDetailedWickets;
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
    <section className={`overflow-hidden rounded-2xl bg-card ring-1 ring-lborder ${isWide ? 'lg:col-span-2' : ''}`}>
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
          <table className={`w-full text-left text-sm ${isWide ? 'min-w-[600px]' : 'min-w-[320px]'}`}>
            <thead>
              <tr className="border-b border-lborder text-xs uppercase tracking-wider text-stext">
                <th className="w-12 px-4 py-2.5">#</th>
                <th className="px-4 py-2.5">Player</th>
                {isDetailedRuns ? (
                  <>
                    <th className="px-3 py-2.5 text-right">Avg</th>
                    <th className="px-3 py-2.5 text-right">SR</th>
                    <th className="px-3 py-2.5 text-right">HS</th>
                    <th className="px-3 py-2.5 text-right">4s</th>
                    <th className="px-3 py-2.5 text-right">6s</th>
                    <th className="px-3 py-2.5 text-right">50/100</th>
                  </>
                ) : isDetailedWickets ? (
                  <>
                    <th className="px-3 py-2.5 text-right">Avg</th>
                    <th className="px-3 py-2.5 text-right">Econ</th>
                    <th className="px-3 py-2.5 text-right">Mdns</th>
                  </>
                ) : null}
                <th className="px-4 py-2.5 text-right font-bold text-mtext">{valueLabel}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const name = formatPlayerName(row.playerName);
                const pid = row.playerId || '';
                const fifties = statMaps.fifties.get(pid);
                const hundreds = statMaps.hundreds.get(pid);
                const milestones =
                  fifties !== undefined || hundreds !== undefined
                    ? `${fifties ?? 0}/${hundreds ?? 0}`
                    : '—';
                return (
                  <tr
                    key={`${row.playerId || stat}-${index}`}
                    className={`border-b border-lborder/60 last:border-0 transition-colors hover:bg-[var(--color-row-hover)] ${
                      index % 2 === 1 ? 'bg-card/60' : ''
                    }`}
                  >
                    <td className="px-4 py-3 align-middle font-mono">
                      <span
                        className={`grid h-6 w-6 place-items-center rounded-sm text-xs font-medium ${
                          index < 3 ? 'bg-brand text-white' : 'bg-elevated text-stext'
                        }`}
                      >
                        {row.rank ?? index + 1}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <Link href={`/players/${row.playerId}`} className="flex items-center gap-2.5 hover:text-accent">
                        {row.profileUrl ? (
                          <PersonAvatar name={name} src={row.profileUrl} size={32} />
                        ) : (
                          <TeamLogo name={row.teamName} code={row.teamAbbr} logoUrl={row.teamLogoUrl} size="xs" link={false} />
                        )}
                        <span className="min-w-0">
                          <span className="block font-semibold text-mtext">{name}</span>
                          <span className="block text-xs text-stext">
                            {row.teamName}
                            {row.teamAbbr ? ` · ${row.teamAbbr}` : ''}
                          </span>
                        </span>
                      </Link>
                    </td>
                    {isDetailedRuns ? (
                      <>
                        <td className="px-3 py-3 text-right align-middle font-mono text-xs tabular-nums text-stext">
                          {statMaps.avg.has(pid) ? formatStatValue('top_average', statMaps.avg.get(pid)!) : '—'}
                        </td>
                        <td className="px-3 py-3 text-right align-middle font-mono text-xs tabular-nums text-stext">
                          {statMaps.sr.has(pid) ? formatStatValue('top_strike_rate', statMaps.sr.get(pid)!) : '—'}
                        </td>
                        <td className="px-3 py-3 text-right align-middle font-mono text-xs tabular-nums text-stext">
                          {statMaps.hs.has(pid) ? formatStatValue('highest_score', statMaps.hs.get(pid)!) : '—'}
                        </td>
                        <td className="px-3 py-3 text-right align-middle font-mono text-xs tabular-nums text-stext">
                          {statMaps.fours.has(pid) ? formatStatValue('top_fours', statMaps.fours.get(pid)!) : '—'}
                        </td>
                        <td className="px-3 py-3 text-right align-middle font-mono text-xs tabular-nums text-stext">
                          {statMaps.sixes.has(pid) ? formatStatValue('top_sixes', statMaps.sixes.get(pid)!) : '—'}
                        </td>
                        <td className="px-3 py-3 text-right align-middle font-mono text-xs tabular-nums text-stext">
                          {milestones}
                        </td>
                      </>
                    ) : isDetailedWickets ? (
                      <>
                        <td className="px-3 py-3 text-right align-middle font-mono text-xs tabular-nums text-stext">
                          {statMaps.avg.has(pid) ? formatStatValue('top_average', statMaps.avg.get(pid)!) : '—'}
                        </td>
                        <td className="px-3 py-3 text-right align-middle font-mono text-xs tabular-nums text-stext">
                          {statMaps.econ.has(pid) ? formatStatValue('top_economy', statMaps.econ.get(pid)!) : '—'}
                        </td>
                        <td className="px-3 py-3 text-right align-middle font-mono text-xs tabular-nums text-stext">
                          {statMaps.maidens.has(pid) ? formatStatValue('top_maidens', statMaps.maidens.get(pid)!) : '—'}
                        </td>
                      </>
                    ) : null}
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
