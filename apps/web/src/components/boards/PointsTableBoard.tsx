'use client';

import { useState } from 'react';
import { Trophy } from 'lucide-react';
import PointsTable from '../PointsTable';
import Badge from '../Badge';
import EmptyState from '../EmptyState';

interface Props {
  standings?: any[];
}

export default function PointsTableBoard({ standings = [] }: Props) {
  const [favoriteTeamId, setFavoriteTeamId] = useState('');

  const rows = [...standings].sort(
    (a, b) => (a.rank ?? 999) - (b.rank ?? 999)
  );

  return (
    <>
      <header className="mb-8">
        <div className="flex items-center gap-2 text-accent">
          <Trophy size={18} />
          <span className="text-xs font-bold uppercase tracking-widest text-stext">
            PSL Standings
          </span>
        </div>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Points Table</h1>
        <p className="mt-2 text-sm text-stext">
          Championship standings, net run rates and playoff qualification status.
        </p>
      </header>

      <div className="mb-8 flex flex-wrap items-center gap-2">
        <Badge tone="qualified">Top 2 — Qualifier</Badge>
        <Badge tone="playoffs">3rd & 4th — Eliminators</Badge>
      </div>

      {rows.length > 0 ? (
        <>
          <PointsTable rows={rows} favoriteTeamId={favoriteTeamId} />
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card p-5 ring-1 ring-lborder">
            <div>
              <p className="text-sm font-bold text-mtext">Highlight a Team</p>
              <p className="text-xs text-stext">
                Select a team to highlight it in the table.
              </p>
            </div>
            <select
              value={favoriteTeamId}
              onChange={(e) => setFavoriteTeamId(e.target.value)}
              className="rounded-xl bg-elevated px-4 py-2.5 text-sm font-semibold text-mtext ring-1 ring-lborder focus:outline-none focus:ring-accent/50"
            >
              <option value="">None</option>
              {rows.map((r) => (
                <option key={r.teamId} value={r.teamId}>
                  {r.teamName}
                </option>
              ))}
            </select>
          </div>
        </>
      ) : (
        <EmptyState title="No table data" message="Standings will appear once the tournament begins." />
      )}
    </>
  );
}
