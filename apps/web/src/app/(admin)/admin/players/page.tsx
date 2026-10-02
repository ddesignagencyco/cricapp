'use client';

import { useEffect, useState } from 'react';
import { UserCircle } from 'lucide-react';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { usePlayersQuery } from '../../../../queries/useDirectoryQueries';
import Pagination from '../../../../components/admin/AdminPagination';
import { AdminAvatar, AdminPageHeader, LoadingState, EmptyState, AdminSearchField, AdminEntityLink } from '../../../../components/admin/AdminShared';
import { cap } from '../../../../utils/helpers';

export default function PlayersPage() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const limit = 20;
  const debouncedQuery = useDebouncedValue(query, 350);
  const playersQuery = usePlayersQuery({ limit, page, q: debouncedQuery.trim() || undefined });
  const players = playersQuery.data?.items || [];
  const total = playersQuery.data?.total || 0;
  const totalPages = Math.max(1, playersQuery.data?.totalPages || Math.ceil(total / limit));

  useEffect(() => { setPage(1); }, [debouncedQuery]);

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Players" subtitle="View all players from the sports data provider." />

      <div className="flex flex-col items-stretch gap-3 rounded-lg p-3 sm:flex-row sm:items-center" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
        <AdminSearchField
          wrapperClassName="max-w-md"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search players..."
        />
      </div>

      {playersQuery.isPending ? <LoadingState variant="people" /> : playersQuery.isError ? (
        <EmptyState icon={<UserCircle size={28} />} title="Players unavailable" message="Try again." />
      ) : players.length === 0 ? (
        <EmptyState icon={<UserCircle size={28} />} title="No players found" />
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="table-scroll">
            <table className="w-full text-left text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Player</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Team</th>
                  <th className="hidden px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider sm:table-cell" style={{ color: 'var(--admin-text-secondary)' }}>Country</th>
                  <th className="hidden px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider md:table-cell" style={{ color: 'var(--admin-text-secondary)' }}>Role</th>
                  <th className="hidden px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider lg:table-cell" style={{ color: 'var(--admin-text-secondary)' }}>Batting</th>
                  <th className="hidden px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider lg:table-cell" style={{ color: 'var(--admin-text-secondary)' }}>Bowling</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  const displayName = p.fullName || p.name;
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--admin-border)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-table-row-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td className="px-4 py-2.5" style={{ color: 'var(--admin-text)' }}>
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="shrink-0"><AdminAvatar name={displayName} src={typeof p.image === 'string' ? p.image : null} size={28} /></span>
                          <div className="min-w-0 max-w-[10rem] sm:max-w-[14rem]">
                            {p.id ? (
                              <span className="block truncate" title={p.fullName || p.name}><AdminEntityLink href={`/players/${p.id}`}>{p.fullName || p.name}</AdminEntityLink></span>
                            ) : (
                              <p className="truncate font-semibold" style={{ color: 'var(--admin-text)' }}>{p.fullName}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[8rem] px-4 py-2.5 text-xs sm:max-w-[10rem]" style={{ color: 'var(--admin-text-secondary)' }}>
                        <span className="block truncate">
                          {p.teamId ? (
                            <AdminEntityLink href={`/teams/${p.teamId}`}>{cap(p.teamName) || 'Team'}</AdminEntityLink>
                          ) : (
                            cap(p.teamName)
                          )}
                        </span>
                      </td>
                      <td className="hidden max-w-[7rem] truncate px-4 py-2.5 text-xs sm:table-cell" style={{ color: 'var(--admin-text-secondary)' }} title={cap(p.country)}>{cap(p.country)}</td>
                      <td className="hidden max-w-[7rem] truncate px-4 py-2.5 text-xs md:table-cell" style={{ color: 'var(--admin-text-secondary)' }} title={cap(p.role)}>{cap(p.role)}</td>
                      <td className="hidden max-w-[7rem] truncate px-4 py-2.5 text-xs lg:table-cell" style={{ color: 'var(--admin-text-secondary)' }} title={cap(p.battingStyle)}>{cap(p.battingStyle)}</td>
                      <td className="hidden max-w-[7rem] truncate px-4 py-2.5 text-xs lg:table-cell" style={{ color: 'var(--admin-text-secondary)' }} title={cap(p.bowlingStyle)}>{cap(p.bowlingStyle)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 flex justify-end" style={{ borderTop: '1px solid var(--admin-border)' }}>
            <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}
