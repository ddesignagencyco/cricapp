'use client';

import { useEffect, useState } from 'react';
import { UserCircle } from 'lucide-react';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { usePlayersQuery } from '../../../../queries/useDirectoryQueries';
import Pagination from '../../../../components/admin/AdminPagination';
import { AdminAvatar, AdminPageHeader, LoadingState, EmptyState, AdminSearchField, AdminEntityLink } from '../../../../components/admin/AdminShared';
import { cap, formatPlayerName } from '../../../../utils/helpers';

/** "1998-10-04" → "4 Oct 1998"; read as UTC so the day never shifts by timezone. */
function formatBirth(value: unknown): string {
  if (typeof value !== 'string' || !value) return '—';
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

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
            {/* Every column shows at every width; on a phone the table scrolls sideways
                inside .table-scroll (hiding columns below sm left nothing to scroll to). */}
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}>
                  <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Player</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Team</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Nationality</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Role</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Date of birth</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  // Fields as the API sends them (Prisma Player): fullName, nationality, birth, team {id, name}.
                  const displayName = formatPlayerName(p.fullName || p.name);
                  const teamId = p.team?.id || p.teamId;
                  const teamName = p.team?.name || p.teamName;
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--admin-border)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-table-row-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td className="px-4 py-2.5" style={{ color: 'var(--admin-text)' }}>
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="shrink-0"><AdminAvatar name={displayName} src={typeof p.image === 'string' ? p.image : null} size={28} /></span>
                          <div className="min-w-0 max-w-[10rem] sm:max-w-[14rem]">
                            {p.id ? (
                              <span className="block truncate" title={displayName}><AdminEntityLink href={`/players/${p.id}`}>{displayName}</AdminEntityLink></span>
                            ) : (
                              <p className="truncate font-semibold" style={{ color: 'var(--admin-text)' }}>{displayName}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[10rem] whitespace-nowrap px-4 py-2.5 text-xs" style={{ color: 'var(--admin-text-secondary)' }}>
                        <span className="block truncate" title={teamName || undefined}>
                          {teamId ? (
                            <AdminEntityLink href={`/teams/${teamId}`}>{teamName || 'Team'}</AdminEntityLink>
                          ) : (
                            teamName || '—'
                          )}
                        </span>
                      </td>
                      <td className="max-w-[9rem] truncate whitespace-nowrap px-4 py-2.5 text-xs" style={{ color: 'var(--admin-text-secondary)' }} title={p.nationality || undefined}>{p.nationality || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs" style={{ color: 'var(--admin-text-secondary)' }}>{cap(p.role)}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs tabular-nums" style={{ color: 'var(--admin-text-secondary)' }}>{formatBirth(p.birth)}</td>
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
