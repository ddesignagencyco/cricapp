'use client';

import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { useMatchesQuery } from '../../../../queries/useDirectoryQueries';
import type { Match } from '../../../../types';
import Pagination from '../../../../components/admin/AdminPagination';
import { AdminPageHeader, LoadingState, EmptyState, StatusBadge, AdminSearchField, AdminSortableHeader, AdminEntityLink, ScoreLine, type SortDirection } from '../../../../components/admin/AdminShared';
import { sideScoreLine } from '../../../../lib/matchScoreboard';

type MatchSortKey = 'home' | 'away' | 'tournament' | 'venue' | 'date' | 'status';

export default function MatchesPage() {
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('all');
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | MatchSortKey>('default');
  const [sortOrder, setSortOrder] = useState<SortDirection>('asc');
  const limit = 20;
  const debouncedQuery = useDebouncedValue(query, 350);
  const matchesQuery = useMatchesQuery({
    limit,
    page,
    q: debouncedQuery.trim() || undefined,
    status: filterStatus === 'all' ? undefined : filterStatus,
    sortBy: sortBy === 'default' ? undefined : sortBy,
    sortOrder: sortBy === 'default' ? undefined : sortOrder,
  });
  const matches = matchesQuery.data?.items || [];
  const total = matchesQuery.data?.total || 0;
  const totalPages = Math.max(1, matchesQuery.data?.totalPages || Math.ceil(total / limit));

  useEffect(() => { setPage(1); }, [filterStatus, debouncedQuery, sortBy, sortOrder]);

  const toggleSort = (key: MatchSortKey) => {
    if (sortBy === key) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else {
        setSortBy('default');
        setSortOrder('asc');
      }
    } else {
      setSortBy(key);
      setSortOrder(key === 'date' ? 'desc' : 'asc');
    }
  };

  const getTeamInfo = (m: Match) => {
    const teams = m.teams;
    const isObj = teams && typeof teams === 'object' && !Array.isArray(teams);
    const names = m.teamNames || [];

    const rawHomeCode = isObj ? teams.home?.code : Array.isArray(teams) ? teams[0] : '';
    const rawAwayCode = isObj ? teams.away?.code : Array.isArray(teams) ? teams[1] : '';

    const homeName =
      (names[0] && !names[0].startsWith('sr:'))
        ? names[0]
        : (isObj && teams.home?.name && !teams.home.name.startsWith('sr:'))
        ? teams.home.name
        : (rawHomeCode || 'TBA').replace(/^sr:competitor:/, 'Team ');

    const awayName =
      (names[1] && !names[1].startsWith('sr:'))
        ? names[1]
        : (isObj && teams.away?.name && !teams.away.name.startsWith('sr:'))
        ? teams.away.name
        : (rawAwayCode || 'TBA').replace(/^sr:competitor:/, 'Team ');

    return {
      homeName,
      awayName,
    };
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Matches" subtitle="View and manage match schedules, scores and results." />

      <div className="flex flex-col gap-3 rounded-lg p-3 md:flex-row md:items-center" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
        <AdminSearchField
          wrapperClassName="max-w-md"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by team, tournament or venue..."
        />
        <div className="flex flex-wrap gap-1.5">
          {['all', 'live', 'upcoming', 'completed'].map((s) => (
            <button key={s} type="button" onClick={() => setFilterStatus(s)} className="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: filterStatus === s ? 'var(--admin-accent)' : 'var(--admin-input-bg)',
                color: filterStatus === s ? 'var(--color-brand-fg)' : 'var(--admin-text-secondary)',
                border: filterStatus === s ? 'none' : '1px solid var(--admin-border)',
              }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {matchesQuery.isPending ? <LoadingState variant="table" /> : matchesQuery.isError ? (
        <EmptyState icon={<Trophy size={28} />} title="Matches unavailable" message="Try again." />
      ) : matches.length === 0 ? (
        <EmptyState icon={<Trophy size={28} />} title="No matches found" message="No matches match your current filters." />
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="table-scroll">
            <table className="w-full text-left text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}>
                  <AdminSortableHeader label="Home" sortKey="home" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} />
                  <AdminSortableHeader label="Away" sortKey="away" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} />
                  <AdminSortableHeader label="Tournament" sortKey="tournament" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} />
                  <AdminSortableHeader label="Venue" sortKey="venue" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} />
                  <AdminSortableHeader label="Date" sortKey="date" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} />
                  <AdminSortableHeader label="Status" sortKey="status" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => {
                  const t = getTeamInfo(m);
                  const homeLabel = t.homeName;
                  const awayLabel = t.awayName;
                  const homeScore = sideScoreLine(m, 'home');
                  const awayScore = sideScoreLine(m, 'away');
                  return (
                    <tr key={m.matchId || m.id} style={{ borderBottom: '1px solid var(--admin-border)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-table-row-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td className="max-w-[8.5rem] truncate px-4 py-2.5 sm:max-w-[14rem]" style={{ color: 'var(--admin-text)' }} title={homeLabel}>
                        {m.matchId || m.id ? (
                          <AdminEntityLink href={`/matches/${m.matchId || m.id}`}>{homeLabel}</AdminEntityLink>
                        ) : (
                          homeLabel
                        )}
                        {homeScore ? <ScoreLine value={homeScore} /> : null}
                      </td>
                      <td className="max-w-[8.5rem] truncate px-4 py-2.5 sm:max-w-[14rem]" style={{ color: 'var(--admin-text)' }} title={awayLabel}>
                        {awayLabel}
                        {awayScore ? <ScoreLine value={awayScore} /> : null}
                      </td>
                      <td className="max-w-[12rem] truncate px-4 py-2.5" style={{ color: 'var(--admin-text-secondary)' }} title={m.tournament || undefined}>
                        {m.tournamentId ? (
                          <AdminEntityLink href={`/tournaments/${m.tournamentId}`}>{m.tournament || 'Tournament'}</AdminEntityLink>
                        ) : (
                          m.tournament || '—'
                        )}
                      </td>
                      <td className="max-w-[120px] truncate px-4 py-2.5" style={{ color: 'var(--admin-text-muted)' }} title={m.venue || undefined}>{m.venue || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono" style={{ color: 'var(--admin-text-muted)' }}>
                        {m.scheduled ? new Date(m.scheduled).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-2.5"><StatusBadge status={m.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5" style={{ borderTop: '1px solid var(--admin-border)' }}>
            <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}
