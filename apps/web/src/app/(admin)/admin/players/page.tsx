'use client';

import { useEffect, useState } from 'react';
import { UserCircle } from 'lucide-react';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { usePlayersQuery } from '../../../../queries/useDirectoryQueries';
import Pagination from '../../../../components/admin/AdminPagination';
import {
  AdminAvatar,
  AdminPageHeader,
  AdminSortableHeader,
  LoadingState,
  EmptyState,
  AdminSearchField,
  AdminEntityLink,
  type SortDirection,
} from '../../../../components/admin/AdminShared';
import { cap, formatPlayerName } from '../../../../utils/helpers';

type PlayerSortKey = 'name' | 'team' | 'nationality' | 'role' | 'birth';

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
  const [sortBy, setSortBy] = useState<PlayerSortKey>('name');
  const [sortOrder, setSortOrder] = useState<SortDirection>('asc');
  const limit = 20;
  const debouncedQuery = useDebouncedValue(query, 350);
  const playersQuery = usePlayersQuery({
    limit,
    page,
    q: debouncedQuery.trim() || undefined,
    sortBy,
    sortOrder,
  });
  const players = playersQuery.data?.items || [];
  const total = playersQuery.data?.total || 0;
  const totalPages = Math.max(1, playersQuery.data?.totalPages || Math.ceil(total / limit));

  useEffect(() => { setPage(1); }, [debouncedQuery, sortBy, sortOrder]);

  const toggleSort = (key: PlayerSortKey) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder(key === 'birth' ? 'desc' : 'asc');
    }
  };

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
                  <AdminSortableHeader label="Player" sortKey="name" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} />
                  <AdminSortableHeader label="Team" sortKey="team" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} />
                  <AdminSortableHeader label="Nationality" sortKey="nationality" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} />
                  <AdminSortableHeader label="Role" sortKey="role" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} />
                  <AdminSortableHeader label="Date of birth" sortKey="birth" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {players.map((p) => {
                  // Fields as the API sends them (Prisma Player): fullName, profileUrl, nationality, birth, team {id, name}.
                  const displayName = formatPlayerName(p.fullName || p.name);
                  const teamId = p.team?.id || p.teamId;
                  const teamName = p.team?.name || p.teamName;
                  const photo =
                    typeof p.profileUrl === 'string' && p.profileUrl
                      ? p.profileUrl
                      : typeof p.image === 'string' && p.image
                        ? p.image
                        : null;
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--admin-border)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-table-row-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td className="px-4 py-2.5" style={{ color: 'var(--admin-text)' }}>
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="shrink-0"><AdminAvatar name={displayName} src={photo} size={28} /></span>
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
