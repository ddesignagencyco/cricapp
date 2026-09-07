'use client';

import Link from 'next/link';
import { Flame, Target, Zap } from 'lucide-react';

const statMeta: Record<string, { label: string; tone: string }> = {
  top_runs: { label: 'Most Runs', tone: 'text-accent' },
  top_wickets: { label: 'Most Wickets', tone: 'text-accent2' },
  top_sixes: { label: 'Most Sixes', tone: 'text-gold' },
  top_fours: { label: 'Most Fours', tone: 'text-accent2' },
};

export function LeaderPanel({ group }: { group: any }) {
  const meta = statMeta[group.stat] || { label: group.stat.replace(/_/g, ' '), tone: 'text-accent' };
  const StatIcon = group.stat.includes('wicket') || group.stat.includes('maiden') || group.stat.includes('dot')
    ? Target : group.stat.includes('six') || group.stat.includes('four') ? Flame : Zap;
  const entries = [...(group.entries || [])]
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    .slice(0, 4);

  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
      <div className="mb-4 flex items-center gap-2">
        <StatIcon size={16} className="text-accent2" />
        <h3 className="text-sm font-bold uppercase tracking-widest text-mtext">{meta.label}</h3>
      </div>
      <div className="space-y-3">
        {entries.map((row, i) => (
          <Link
            key={row.playerId || i}
            href={`/players/${row.playerId}`}
            className="flex items-center gap-3 rounded-sm p-2 transition-colors hover:bg-elevated"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-elevated font-mono text-xs font-bold text-accent">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-mtext">{row.playerName}</p>
              <p className="truncate text-xs text-stext">
                {row.teamName} ({row.teamAbbr})
              </p>
            </div>
            <span className={`font-mono text-base font-bold tabular-nums ${meta.tone}`}>
              {row.value}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}