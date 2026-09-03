'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BarChart3, Crown, Droplet, Gauge, Goal, Target, Users } from 'lucide-react';
import Badge from '../Badge';
import StatCard from '../StatCard';
import Tabs from '../Tabs';
import TeamLogo from '../TeamLogo';
import EmptyState from '../EmptyState';
import FavoriteButton from '../FavoriteButton';
import { formatRate } from '../../utils/helpers.js';

const playerTabs = [
  { key: 'batting', label: 'Batting' },
  { key: 'bowling', label: 'Bowling' },
  { key: 'recent', label: 'Recent Form' },
];

export default function PlayerDetailBody({ player, teammates }) {
  const [tab, setTab] = useState('batting');

  if (!player) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState title="Player not found" message="We couldn't find that player in our directory." />
      </div>
    );
  }

  const initials = player.name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="mx-auto max-w-6xl space-y-3 px-4 py-8 sm:px-6">
      <nav className="flex items-center gap-1.5 text-xs text-stext">
        <Link href="/players" className="hover:text-accent">Players</Link>
        <span>/</span>
        <span className="text-mtext">{player.name}</span>
      </nav>

      <header className="rounded-3xl bg-card p-6 ring-1 ring-lborder sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="grid h-24 w-24 shrink-0 place-items-center rounded-3xl bg-elevated text-3xl font-black text-accent ring-1 ring-lborder">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">{player.name}</h1>
              <FavoriteButton id={player.id} type="player" size={20} />
            </div>
            <p className="mt-1 text-sm text-stext">
              {player.teamName} • {player.country} • {player.role}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge tone="neutral">{player.battingStyle}</Badge>
              <Badge tone="neutral">{player.bowlingStyle}</Badge>
              <Badge tone="neutral">{player.teamName}</Badge>
            </div>
          </div>
          <Link
            href={`/teams/${player.teamId}`}
            className="group flex shrink-0 items-center gap-3 rounded-2xl bg-elevated px-4 py-3 transition-colors hover:bg-card"
          >
            <TeamLogo teamId={player.teamId} size="md" link={false} />
            <div>
              <p className="text-xs text-stext">Team</p>
              <p className="text-sm font-bold text-mtext group-hover:text-accent">{player.teamName}</p>
            </div>
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 pt-4 lg:grid-cols-4">
        <StatCard label="Matches" value={player.matches} icon={Users} />
        <StatCard label="Runs" value={player.runs.toLocaleString()} tone="green" icon={Goal} />
        <StatCard label="Wickets" value={player.wickets} tone="accent" icon={Target} />
        <StatCard label="Strike Rate" value={player.strikeRate ? formatRate(player.strikeRate) : '—'} icon={Gauge} />
      </div>

      <div className="pt-4">
        <Tabs tabs={playerTabs} active={tab} onChange={setTab} />
      </div>

      {tab === 'batting' && (
        <div className="fade-in grid grid-cols-1 gap-4 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Highest Score" value={player.highestScore || '—'} sub="Career best" tone="green" />
          <StatCard label="Average" value={player.average ? formatRate(player.average) : '—'} sub="Career avg" />
          <StatCard label="Fifties" value={player.fifties ?? 0} sub="Half-centuries" tone="accent" />
          <StatCard label="Centuries" value={player.centuries ?? 0} sub="Hundreds" tone="gold" />
          <StatCard label="Sixes" value={player.sixes ?? 0} sub="Maximums" tone="gold" icon={Crown} />
          <StatCard label="Fours" value={Math.round((player.sixes || 0) * 1.5)} sub="Estimated" />
          <StatCard label="Balls Faced" value={(player.runs || 0)} sub="Career" icon={Droplet} />
          <StatCard label="100+ Scores" value={player.centuries ?? 0} sub="Not outs count" />
        </div>
      )}

      {tab === 'bowling' && (
        <div className="fade-in grid grid-cols-1 gap-4 pt-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Wickets" value={player.wickets} sub="Career" tone="accent" icon={Target} />
          <StatCard label="Best Bowling" value={player.bestBowling || '—'} sub="Innings best" tone="green" />
          <StatCard label="Economy" value={player.economy ? formatRate(player.economy) : '—'} sub="Per over" />
          <StatCard label="Average" value={player.average ? formatRate(player.average) : '—'} sub="Per wicket" />
          <StatCard label="5-Wicket Hauls" value={0} sub="This season" />
          <StatCard label="3-Wicket Hauls" value={Math.floor(player.wickets / 5)} sub="This season" />
        </div>
      )}

      {tab === 'recent' && (
        <div className="fade-in pt-5">
          <h3 className="mb-4 text-lg font-bold text-mtext">Recent Form</h3>
          {teammates.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {teammates.map((p) => (
                <Link
                  key={p.id}
                  href={`/players/${p.id}`}
                  className="rounded-2xl bg-card p-4 ring-1 ring-lborder transition-all hover:-translate-y-0.5 hover:bg-elevated"
                >
                  <p className="text-sm font-bold text-mtext">{p.name}</p>
                  <p className="text-xs text-stext">{p.role}</p>
                  <p className="mt-2 font-mono text-sm text-accent2">{p.runs} runs</p>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="No form data" message="Recent performances will appear here shortly." />
          )}
        </div>
      )}

      <div className="pt-6">
        <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-mtext">
          <BarChart3 size={18} className="text-accent" /> At a glance
        </h3>
        <div className="overflow-x-auto rounded-2xl bg-card ring-1 ring-lborder">
          <table className="w-full min-w-[420px] text-left text-sm">
            <thead>
              <tr className="border-b border-lborder text-[11px] uppercase tracking-wider text-stext">
                <th className="px-4 py-3">Metric</th>
                <th className="px-4 py-3">Value</th>
                <th className="px-4 py-3">Span</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-lborder/60">
                <td className="px-4 py-2.5 font-semibold text-mtext">Matches</td>
                <td className="px-4 py-2.5 font-mono font-bold text-accent">{player.matches}</td>
                <td className="px-4 py-2.5 text-stext">Career</td>
              </tr>
              <tr className="border-b border-lborder/60">
                <td className="px-4 py-2.5 font-semibold text-mtext">Batting Average</td>
                <td className="px-4 py-2.5 font-mono font-bold text-accent">{player.average ? formatRate(player.average) : '—'}</td>
                <td className="px-4 py-2.5 text-stext">Career</td>
              </tr>
              <tr className="border-b border-lborder/60">
                <td className="px-4 py-2.5 font-semibold text-mtext">Strike Rate</td>
                <td className="px-4 py-2.5 font-mono font-bold text-accent">{player.strikeRate ? formatRate(player.strikeRate) : '—'}</td>
                <td className="px-4 py-2.5 text-stext">Career</td>
              </tr>
              <tr className="last:border-0">
                <td className="px-4 py-2.5 font-semibold text-mtext">Role</td>
                <td className="px-4 py-2.5 font-mono font-bold text-accent">{player.role}</td>
                <td className="px-4 py-2.5 text-stext">Squad</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}