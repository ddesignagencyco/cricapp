'use client';

import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { useToursQuery } from '../../../../queries/useDirectoryQueries';
import type { Tour } from '../../../../types';
import Pagination from '../../../../components/admin/AdminPagination';
import {
  AdminAvatar,
  AdminChip,
  AdminPageHeader,
  AdminResultCount,
  LoadingState,
  EmptyState,
  AdminSearchField,
  AdminEntityLink,
} from '../../../../components/admin/AdminShared';

/** Sportradar sends category/sport as objects; older rows may hold plain strings. */
function part(value: Tour['category'] | Tour['sport'], key: 'name' | 'country_code' | 'id'): string {
  if (!value) return '';
  if (typeof value === 'string') return key === 'name' ? value : '';
  const raw = (value as Record<string, unknown>)[key];
  return typeof raw === 'string' ? raw : '';
}

export default function ToursPage() {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const limit = 20;
  const search = useDebouncedValue(query, 350).trim();
  const toursQuery = useToursQuery({ limit, page, q: search || undefined });
  const tours = toursQuery.data?.items || [];
  const total = toursQuery.data?.total || 0;
  const totalPages = Math.max(1, toursQuery.data?.totalPages || Math.ceil(total / limit));

  useEffect(() => { setPage(1); }, [search]);

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Tours" subtitle="Cricket tours (countries and regions) from the sports data provider." />

      <div className="flex flex-col gap-3 rounded-lg p-3 sm:flex-row sm:items-center" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
        <AdminSearchField
          wrapperClassName="max-w-md"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tours by name or country code..."
        />
        <div className="min-w-0 shrink-0 sm:pl-1">
          <AdminResultCount shown={tours.length} total={total} noun="tours" />
        </div>
      </div>

      {toursQuery.isPending ? <LoadingState variant="table" /> : toursQuery.isError ? (
        <EmptyState icon={<Globe size={28} />} title="Tours unavailable" message="Try again." />
      ) : tours.length === 0 ? (
        <EmptyState icon={<Globe size={28} />} title="No tours found" message="Try a different name or clear the search." />
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="table-scroll">
            {/* Every column shows at every width; on a phone the table scrolls sideways. */}
            <table className="w-full min-w-[600px] text-left text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}>
                  <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Tour</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Country code</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Sport</th>
                  <th className="whitespace-nowrap px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Tournaments</th>
                </tr>
              </thead>
              <tbody>
                {tours.map((t) => {
                  const code = part(t.category, 'country_code');
                  const sport = part(t.sport, 'name') || 'Cricket';
                  const count = typeof t.tournamentCount === 'number' ? t.tournamentCount : null;
                  return (
                    <tr key={t.id} className="admin-row-hover" style={{ borderBottom: '1px solid var(--admin-border)' }}>
                      <td className="px-4 py-2.5" style={{ color: 'var(--admin-text)' }}>
                        <div className="flex min-w-0 items-center gap-2.5">
                          <span className="shrink-0"><AdminAvatar name={t.name} size={28} /></span>
                          <div className="min-w-0 max-w-[14rem]">
                            <p className="truncate text-sm font-semibold" style={{ color: 'var(--admin-text)' }} title={t.name}>{t.name}</p>
                            <p className="mt-0.5 truncate font-mono text-[11px]" style={{ color: 'var(--admin-text-muted)' }} title={t.id}>{t.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {code ? <AdminChip label={code} tone="accent" /> : <span style={{ color: 'var(--admin-text-muted)' }}>—</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5" style={{ color: 'var(--admin-text-secondary)' }}>{sport}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono tabular-nums">
                        {count ? (
                          <AdminEntityLink href={`/tournaments?country=${encodeURIComponent(t.name)}`}>{count}</AdminEntityLink>
                        ) : (
                          <span style={{ color: 'var(--admin-text-muted)' }}>{count ?? '—'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="flex justify-center px-4 py-2.5 sm:justify-end" style={{ borderTop: '1px solid var(--admin-border)' }}>
            <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}
