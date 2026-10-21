'use client';

import { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { useTeamsQuery } from '../../../../queries/useDirectoryQueries';
import Pagination from '../../../../components/admin/AdminPagination';
import { AdminAvatar, AdminPageHeader, LoadingState, EmptyState, AdminSearchField, AdminEntityLink } from '../../../../components/admin/AdminShared';

export default function TeamsPage() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const limit = 20;
  const debouncedQuery = useDebouncedValue(query, 350);
  const teamsQuery = useTeamsQuery({ limit, page, q: debouncedQuery.trim() || undefined });
  const teams = teamsQuery.data?.items || [];
  const total = teamsQuery.data?.total || 0;
  const totalPages = Math.max(1, teamsQuery.data?.totalPages || Math.ceil(total / limit));

  useEffect(() => { setPage(1); }, [debouncedQuery]);

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
                  <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Team</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Abbreviation</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Country</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Manager</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Total players</th>
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
