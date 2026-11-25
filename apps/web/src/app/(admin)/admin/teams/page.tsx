'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { useTeamsQuery } from '../../../../queries/useDirectoryQueries';
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

type TeamSortKey = 'name' | 'abbr' | 'country' | 'manager' | 'players';

export default function TeamsPage() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [sortBy, setSortBy] = useState<TeamSortKey>('name');
  const [sortOrder, setSortOrder] = useState<SortDirection>('asc');
  const limit = 20;
  const debouncedQuery = useDebouncedValue(query, 350);
  const teamsQuery = useTeamsQuery({
    limit,
    page,
    q: debouncedQuery.trim() || undefined,
    sortBy,
    sortOrder,
  });
  const teams = teamsQuery.data?.items || [];
  const total = teamsQuery.data?.total || 0;
  const totalPages = Math.max(1, teamsQuery.data?.totalPages || Math.ceil(total / limit));

  useEffect(() => { setPage(1); }, [debouncedQuery, sortBy, sortOrder]);

  const toggleSort = (key: TeamSortKey) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder(key === 'players' ? 'desc' : 'asc');
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Teams" subtitle="View all teams from the sports data provider." />

      <div className="flex flex-col items-stretch gap-3 rounded-lg p-3 sm:flex-row sm:items-center" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
        <AdminSearchField
          wrapperClassName="max-w-md"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search teams..."
        />
      </div>

      {teamsQuery.isPending ? <LoadingState variant="people" /> : teamsQuery.isError ? (
        <EmptyState icon={<Users size={28} />} title="Teams unavailable" message="Try again." />
      ) : teams.length === 0 ? (
        <EmptyState icon={<Users size={28} />} title="No teams found" />
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="table-scroll">
            {/* Every column shows at every width; on a phone the table scrolls sideways
                inside .table-scroll (hiding columns below sm left nothing to scroll to). */}
            <table className="w-full min-w-[640px] text-left text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}>
                  <AdminSortableHeader label="Team" sortKey="name" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} />
                  <AdminSortableHeader label="Abbreviation" sortKey="abbr" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} />
                  <AdminSortableHeader label="Country" sortKey="country" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} />
                  <AdminSortableHeader label="Manager" sortKey="manager" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} />
                  <AdminSortableHeader label="Total players" sortKey="players" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} />
                </tr>
              </thead>
              <tbody>
                {teams.map((t) => {
                  // Fields as the API sends them (Prisma Team): abbr, country, manager, logoUrl.
                  const abbr = typeof t.abbr === 'string' ? t.abbr : '';
                  const manager = typeof t.manager === 'string' ? t.manager : '';
                  const logo = typeof t.logoUrl === 'string' ? t.logoUrl : t.logo;
                  const playerCount = typeof t.playerCount === 'number' ? t.playerCount : null;
                  const badgeLabel = t.name || abbr || '?';
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--admin-border)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-table-row-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td className="px-4 py-2.5" style={{ color: 'var(--admin-text)' }}>
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="shrink-0"><AdminAvatar name={badgeLabel} src={logo} size={28} /></span>
                          <span className="block min-w-0 max-w-[10rem] truncate sm:max-w-[14rem]" title={t.name}>
                            {t.id ? (
                              <AdminEntityLink href={`/teams/${t.id}`}>{t.name}</AdminEntityLink>
                            ) : (
                              <span className="font-semibold" style={{ color: 'var(--admin-text)' }}>{t.name}</span>
                            )}
                          </span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono" style={{ color: 'var(--admin-text-secondary)' }}>{abbr || '—'}</td>
                      <td className="max-w-[10rem] truncate whitespace-nowrap px-4 py-2.5" style={{ color: 'var(--admin-text-secondary)' }} title={t.country || undefined}>{t.country || '—'}</td>
                      <td className="max-w-[10rem] truncate whitespace-nowrap px-4 py-2.5" style={{ color: 'var(--admin-text-secondary)' }} title={manager || undefined}>{manager || '—'}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono tabular-nums" style={{ color: 'var(--admin-text)' }}>{playerCount ?? '—'}</td>
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
