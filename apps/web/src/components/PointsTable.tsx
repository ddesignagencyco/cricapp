'use client';

import Link from 'next/link';
import { getInitials } from '../utils/helpers';
import { PointsRow } from '../types';

interface PointsTableProps {
  rows?: PointsRow[];
  favoriteTeamId?: string;
}

export default function PointsTable({ rows = [], favoriteTeamId }: PointsTableProps) {
  if (!rows.length) return null;
  return (
    <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-lborder">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead>
            <tr className="border-b border-lborder text-[11px] uppercase tracking-wider text-stext">
              <th className="px-4 py-3">Pos</th>
              <th className="px-4 py-3">Team</th>
              <th className="px-4 py-3 text-center">P</th>
              <th className="px-4 py-3 text-center">W</th>
              <th className="px-4 py-3 text-center">L</th>
              <th className="px-4 py-3 text-right">NRR</th>
              <th className="px-4 py-3 text-center">Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isFavorite = favoriteTeamId && row.teamId === favoriteTeamId;
              const rowStyle = isFavorite
                ? 'bg-accent/10 ring-1 ring-inset ring-accent/20'
                : i % 2 === 1
                  ? 'bg-card/60'
                  : '';
              return (
                <tr
                  key={row.teamId}
                  className={`border-b border-lborder/60 transition-colors last:border-0 hover:bg-elevated/60 ${rowStyle}`}
                >
                  <td className="px-4 py-3 font-mono text-stext">{i + 1}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/teams/${row.teamId}`}
                      className="flex items-center gap-2.5 hover:text-accent"
                    >
                      <TeamMark name={row.teamName} code={row.teamAbbr} />
                      <span className="font-semibold">{row.teamName}</span>
                      <span className="text-[11px] uppercase tracking-wider text-stext">
                        {row.teamAbbr}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-center font-mono text-stext">{row.played}</td>
                  <td className="px-4 py-3 text-center font-mono text-accent2">{row.won}</td>
                  <td className="px-4 py-3 text-center font-mono text-danger">{row.lost}</td>
                  <td
                    className={`px-4 py-3 text-right font-mono ${
                      row.netRunRate >= 0 ? 'text-accent2' : 'text-danger'
                    }`}
                  >
                    {row.netRunRate}
                  </td>
                  <td className="px-4 py-3 text-center font-mono font-bold text-mtext">
                    {row.points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TeamMark({ name, code }: { name: string; code: string }) {
  return (
    <span
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border-2 border-accent bg-primary text-xs font-extrabold text-accent"
      title={name}
    >
      {getInitials(name || code)}
    </span>
  );
}
