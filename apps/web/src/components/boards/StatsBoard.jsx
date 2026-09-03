'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Award, BarChart3, Flame, Gauge, Rocket, Target, TrendingUp, Zap,
} from 'lucide-react';
import StatCard from '../StatCard';
import Tabs from '../Tabs';
import { formatNumber } from '../../utils/helpers.js';

const statsTabs = [
  { key: 'batting', label: 'Batting' },
  { key: 'bowling', label: 'Bowling' },
];

export default function StatsBoard({ players }) {
  const [tab, setTab] = useState('batting');

  const batting = useMemo(() => {
    const list = players || [];
    return {
      mostRuns: [...list].sort((a, b) => b.runs - a.runs),
      bestSR: [...list].sort((a, b) => b.strikeRate - a.strikeRate),
      mostSixes: [...list].sort((a, b) => (b.sixes || 0) - (a.sixes || 0)),
      highestScore: [...list].sort((a, b) => (b.highestScore || 0) - (a.highestScore || 0)),
    };
  }, [players]);

  const bowling = useMemo(() => {
    const list = (players || []).filter((p) => p.wickets > 0);
    return {
      mostWickets: [...list].sort((a, b) => b.wickets - a.wickets),
      bestEconomy: [...list].sort((a, b) => (a.economy || 99) - (b.economy || 99)),
      bestBowling: [...list].sort(
        (a, b) => parseInt(b.bestBowling || '0/99', 10) - parseInt(a.bestBowling || '0/99', 10)
      ),
    };
  }, [players]);

  const topRuns = batting.mostRuns[0];
  const topWickets = bowling.mostWickets[0];

  return (
    <>
      <header className="mb-8">
        <div className="flex items-center gap-2 text-accent">
          <BarChart3 size={18} />
          <span className="text-xs font-bold uppercase tracking-widest text-stext">
            PSL 2026 Season Leaders
          </span>
        </div>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Statistics</h1>
        <p className="mt-2 text-sm text-stext">
          The best of the season — runs, wickets, strike rates and more across every franchise.
        </p>
      </header>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {topRuns && (
          <StatCard label="Most Runs" value={formatNumber(topRuns.runs)} sub={topRuns.name} tone="green" icon={Zap} />
        )}
        {topWickets && (
          <StatCard label="Most Wickets" value={topWickets.wickets} sub={topWickets.name} tone="accent" icon={Target} />
        )}
        <StatCard
          label="Best Strike Rate"
          value={batting.bestSR[0]?.strikeRate ? batting.bestSR[0].strikeRate.toFixed(2) : '—'}
          sub={batting.bestSR[0]?.name || '—'}
          tone="gold"
          icon={Rocket}
        />
        <StatCard
          label="Best Economy"
          value={bowling.bestEconomy[0]?.economy ? bowling.bestEconomy[0].economy.toFixed(2) : '—'}
          sub={bowling.bestEconomy[0]?.name || '—'}
          tone="gold"
          icon={Gauge}
        />
      </div>

      <div className="mb-6">
        <Tabs tabs={statsTabs} active={tab} onChange={setTab} />
      </div>

      {tab === 'batting' && (
        <div className="fade-in space-y-8 pt-4">
          <section>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-mtext">
              <TrendingUp size={18} className="text-accent2" /> Most Runs
            </h3>
            <LeaderTable
              rows={batting.mostRuns.map((p) => ({
                id: p.id,
                name: p.name,
                team: p.teamName,
                teamId: p.teamId,
                value: formatNumber(p.runs),
                highlight: p.id === topRuns?.id,
              }))}
              subLabel="Runs"
            />
          </section>

          <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-mtext">
                <Flame size={18} className="text-gold" /> Most Sixes
              </h3>
              <LeaderTable
                rows={batting.mostSixes
                  .filter((p) => p.sixes > 0)
                  .map((p) => ({
                    id: p.id,
                    name: p.name,
                    team: p.teamName,
                    teamId: p.teamId,
                    value: p.sixes,
                    highlight: p.id === batting.mostSixes[0]?.id,
                  }))}
                subLabel="Sixes"
              />
            </div>
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-mtext">
                <Award size={18} className="text-gold" /> Highest Score
              </h3>
              <LeaderTable
                rows={batting.highestScore.map((p) => ({
                  id: p.id,
                  name: p.name,
                  team: p.teamName,
                  teamId: p.teamId,
                  value: p.highestScore,
                  highlight: p.id === batting.highestScore[0]?.id,
                }))}
                subLabel="Best"
              />
            </div>
          </section>
        </div>
      )}

      {tab === 'bowling' && (
        <div className="fade-in space-y-8 pt-4">
          <section>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-mtext">
              <Target size={18} className="text-accent" /> Most Wickets
            </h3>
            <LeaderTable
              rows={bowling.mostWickets.map((p) => ({
                id: p.id,
                name: p.name,
                team: p.teamName,
                teamId: p.teamId,
                value: p.wickets,
                highlight: p.id === topWickets?.id,
              }))}
              subLabel="Wickets"
            />
          </section>

          <section className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-mtext">
                <Gauge size={18} className="text-accent2" /> Best Economy
              </h3>
              <LeaderTable
                rows={bowling.bestEconomy.slice(0, 10).map((p) => ({
                  id: p.id,
                  name: p.name,
                  team: p.teamName,
                  teamId: p.teamId,
                  value: p.economy ? p.economy.toFixed(2) : '—',
                  highlight: false,
                }))}
                subLabel="Economy"
              />
            </div>
            <div>
              <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-mtext">
                <Award size={18} className="text-gold" /> Best Bowling Figures
              </h3>
              <LeaderTable
                rows={bowling.bestBowling.map((p) => ({
                  id: p.id,
                  name: p.name,
                  team: p.teamName,
                  teamId: p.teamId,
                  value: p.bestBowling || '—',
                  highlight: false,
                }))}
                subLabel="Figures"
              />
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function LeaderTable({ rows, subLabel }) {
  return (
    <div className="overflow-x-auto rounded-2xl bg-card ring-1 ring-lborder">
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-lborder text-[11px] uppercase tracking-wider text-stext">
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Player</th>
            <th className="px-4 py-3 text-right">{subLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id}
              className={`border-b border-lborder/60 last:border-0 transition-colors hover:bg-elevated/60 ${
                row.highlight ? 'bg-accent/10' : ''
              }`}
            >
              <td className="px-4 py-2.5 font-mono text-stext">
                <span className={`grid h-6 w-6 place-items-center rounded-md text-[11px] font-black ${i < 3 ? 'bg-accent/15 text-accent' : 'bg-elevated text-stext'}`}>
                  {i + 1}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <Link href={`/players/${row.id}`} className="flex items-center gap-2 hover:text-accent">
                  <span className="text-sm">
                    <span className="font-bold text-mtext">{row.name}</span>
                    <span className="block text-xs text-stext">{row.team}</span>
                  </span>
                  {row.highlight && (
                    <span className="ml-1 rounded bg-gold/15 px-1.5 text-[10px] font-bold uppercase text-gold">
                      Leader
                    </span>
                  )}
                </Link>
              </td>
              <td className="px-4 py-2.5 text-right font-mono text-base font-bold tabular-nums text-mtext">
                {row.value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}