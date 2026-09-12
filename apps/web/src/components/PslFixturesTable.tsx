'use client';

import { useState } from 'react';
import TeamLogo from './TeamLogo';
import Pagination from './Pagination';
import { StatusBadge } from './Badge';
import { formatScheduled, cap } from '../utils/helpers';
import type { PslSchedule } from '../types/index';

const PAGE_SIZE = 15;

interface Props {
  matches: PslSchedule[];
}

export default function PslFixturesTable({ matches }: Props) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(matches.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  const pageMatches = matches.slice(start, start + PAGE_SIZE);

  return (
    <>
      <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-lborder">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] text-left text-sm">
            <thead>
              <tr className="border-b border-lborder text-xs uppercase tracking-wider text-stext">
                <th className="px-4 py-3 text-center">#</th>
                <th className="px-4 py-3">Home</th>
                <th className="px-4 py-3 text-center">vs</th>
                <th className="px-4 py-3">Away</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {pageMatches.map((m, i) => {
                const { date, time } = formatScheduled(m.scheduled);
                return (
                  <tr
                    key={m.matchId}
                    className="border-b border-lborder/60 last:border-0 transition-colors hover:bg-elevated/60"
                  >
                    <td className="px-4 py-3 text-center font-mono text-xs text-stext">{start + i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <TeamLogo code={m.homeTeamAbbr} size="xs" link={false} />
                        <span className="font-bold text-mtext">{cap(m.homeTeamName) || m.homeTeamAbbr}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center text-xs font-black italic text-stext/50">VS</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <TeamLogo code={m.awayTeamAbbr} size="xs" link={false} />
                        <span className="font-bold text-mtext">{cap(m.awayTeamName) || m.awayTeamAbbr}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-stext">
                      <span>{date}</span>
                      {time && <span className="ml-1 text-stext">{time}</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <StatusBadge status={m.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Pagination page={page} totalPages={totalPages} total={matches.length} limit={PAGE_SIZE} onPageChange={setPage} />
    </>
  );
}
