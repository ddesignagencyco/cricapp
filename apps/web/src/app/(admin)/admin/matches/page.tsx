'use client';

import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { useMatchesQuery } from '../../../../queries/useDirectoryQueries';
import type { Match } from '../../../../types';
import Pagination from '../../../../components/admin/AdminPagination';
import { AdminPageHeader, LoadingState, EmptyState, StatusBadge, AdminSearchField, AdminEntityLink } from '../../../../components/admin/AdminShared';
import EntityAvatar from '../../../../components/EntityAvatar';
import { getInitials } from '../../../../utils/helpers';
import { compactMatchScore } from '../../../../lib/matchScoreboard';

export default function MatchesPage() {
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('all');
  const [query, setQuery] = useState('');
  const limit = 20;
  const debouncedQuery = useDebouncedValue(query, 350);
  const matchesQuery = useMatchesQuery({
    limit,
    page,
    q: debouncedQuery.trim() || undefined,
    status: filterStatus === 'all' ? undefined : filterStatus,
  });
  const matches = matchesQuery.data?.items || [];
  const total = matchesQuery.data?.total || 0;
  const totalPages = Math.max(1, matchesQuery.data?.totalPages || Math.ceil(total / limit));

  useEffect(() => { setPage(1); }, [filterStatus, debouncedQuery]);

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
        <div className="flex gap-1.5">
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
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Teams</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Score</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Tournament</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Venue</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Date</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-right" style={{ color: 'var(--admin-text-secondary)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => {
                  const t = getTeamInfo(m);
                  const homeLabel = t.homeName;
                  const awayLabel = t.awayName;
                  return (
                    <tr key={m.matchId || m.id} style={{ borderBottom: '1px solid var(--admin-border)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-table-row-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td className="px-4 py-2.5" style={{ color: 'var(--admin-text)' }}>
                        {m.matchId || m.id ? (
                          <AdminEntityLink href={`/matches/${m.matchId || m.id}`}>
                            <TeamMatchup home={homeLabel} away={awayLabel} />
                          </AdminEntityLink>
                        ) : (
                          <TeamMatchup home={homeLabel} away={awayLabel} />
                        )}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold" style={{ color: 'var(--admin-text)' }}>
                        {compactMatchScore(m)}
                      </td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--admin-text-secondary)' }}>
                        {m.tournamentId ? (
                          <AdminEntityLink href={`/tournaments/${m.tournamentId}`}>{m.tournament || 'Tournament'}</AdminEntityLink>
                        ) : (
                          m.tournament || '—'
                        )}
                      </td>
                      <td className="px-4 py-2.5 max-w-[120px] truncate" style={{ color: 'var(--admin-text-muted)' }}>{m.venue || '—'}</td>
                      <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--admin-text-muted)' }}>
                        {m.scheduled ? new Date(m.scheduled).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right"><StatusBadge status={m.status} /></td>
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

function TeamMatchup({ home, away }: { home: string; away: string }) {
  return (
    <div className="flex items-center gap-2 whitespace-nowrap">
      <span className="flex items-center gap-1.5">
        <TeamBadge code={home} />
        <span className="text-[13px] font-semibold">{home}</span>
      </span>
      <span className="text-[11px] font-bold uppercase" style={{ color: 'var(--admin-text-muted)' }}>vs</span>
      <span className="flex items-center gap-1.5">
        <TeamBadge code={away} />
        <span className="text-[13px] font-semibold">{away}</span>
      </span>
    </div>
  );
}

function TeamBadge({ code }: { code: string }) {
  if (!code) return null;
  return (
    <EntityAvatar className="h-6 w-6 text-xs font-bold">{getInitials(code)}</EntityAvatar>
  );
}
