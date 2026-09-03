'use client';

import { useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import PointsTable from '../PointsTable';
import Tabs from '../Tabs';
import Badge from '../Badge';
import EmptyState from '../EmptyState';

const statusLegend = [
  { label: 'Qualified', tone: 'qualified' },
  { label: 'Playoffs', tone: 'playoffs' },
  { label: 'Eliminated', tone: 'eliminated' },
];

export default function PointsTableBoard({ teams, matches }) {
  const [favoriteTeamId, setFavoriteTeamId] = useState('lahore-qalandars');
  const [view, setView] = useState('psl');

  const rows = useMemo(() => {
    let list = teams || [];
    if (view === 'psl') {
      list = [...list].sort(
        (a, b) => b.points - a.points || parseFloat(b.nrr) - parseFloat(a.nrr)
      );
    }
    return list.map((t, i) => ({
      teamId: t.id,
      name: t.name,
      played: t.matches,
      won: t.wins,
      lost: t.losses,
      points: t.points,
      nrr: t.nrr,
      status: t.status,
      position: i + 1,
    }));
  }, [teams, view]);

  const pslMatches = (matches || []).filter((m) => m.tournamentId === 't1');
  const played = pslMatches.filter((m) => m.status === 'completed' || m.status === 'live').length;
  const total = 34;

  return (
    <>
      <header className="mb-8">
        <div className="flex items-center gap-2 text-accent">
          <Trophy size={18} />
          <span className="text-xs font-bold uppercase tracking-widest text-stext">
            PSL 2026 Standings
          </span>
        </div>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Points Table</h1>
        <p className="mt-2 text-sm text-stext">
          Championship standings, net run rates and playoff qualification status.
        </p>
      </header>

      <div className="mb-8 rounded-2xl bg-card p-5 ring-1 ring-lborder">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-bold text-mtext">League Stage Progress</p>
            <p className="text-xs text-stext">
              {played} of {total} matches completed
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {statusLegend.map((s) => (
              <Badge key={s.label} tone={s.tone}>{s.label}</Badge>
            ))}
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-elevated">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-accent2"
            style={{ width: `${(played / total) * 100}%` }}
          />
        </div>
      </div>

      <div className="mb-6">
        <Tabs
          tabs={[
            { key: 'all', label: 'All Teams' },
            { key: 'psl', label: 'PSL 2026' },
          ]}
          active={view}
          onChange={setView}
        />
      </div>

      {rows.length > 0 ? (
        <>
          <PointsTable rows={rows} favoriteTeamId={favoriteTeamId} />
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-card p-5 ring-1 ring-lborder">
            <div>
              <p className="text-sm font-bold text-mtext">Your Favourite Team</p>
              <p className="text-xs text-stext">
                Select a team to highlight it in the table.
              </p>
            </div>
            <select
              value={favoriteTeamId}
              onChange={(e) => setFavoriteTeamId(e.target.value)}
              className="rounded-xl bg-elevated px-4 py-2.5 text-sm font-semibold text-mtext ring-1 ring-lborder focus:outline-none focus:ring-accent/50"
            >
              {rows.map((r) => (
                <option key={r.teamId} value={r.teamId}>
                  {r.name}
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