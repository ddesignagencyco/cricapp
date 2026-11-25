'use client';

import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { useDebouncedValue } from '../../../../hooks/useDebouncedValue';
import { useToursQuery } from '../../../../queries/useDirectoryQueries';
import type { Tour } from '../../../../types';
import Pagination from '../../../../components/admin/AdminPagination';
import {
  AdminChip,
  AdminPageHeader,
  AdminResultCount,
  AdminSortableHeader,
  LoadingState,
  EmptyState,
  AdminSearchField,
  AdminEntityLink,
  type SortDirection,
} from '../../../../components/admin/AdminShared';

type TourSortKey = 'name' | 'country' | 'sport' | 'tournaments';

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
  const [sortBy, setSortBy] = useState<TourSortKey>('name');
  const [sortOrder, setSortOrder] = useState<SortDirection>('asc');
  const limit = 20;
  const search = useDebouncedValue(query, 350).trim();
  const toursQuery = useToursQuery({
    limit,
    page,
    q: search || undefined,
    sortBy,
    sortOrder,
  });
  const tours = toursQuery.data?.items || [];
  const total = toursQuery.data?.total || 0;
  const totalPages = Math.max(1, toursQuery.data?.totalPages || Math.ceil(total / limit));

  useEffect(() => { setPage(1); }, [search, sortBy, sortOrder]);

  const toggleSort = (key: TourSortKey) => {
    if (sortBy === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(key);
      setSortOrder(key === 'tournaments' ? 'desc' : 'asc');
    }
  };

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
                  <AdminSortableHeader label="Tour" sortKey="name" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} />
                  <AdminSortableHeader label="Country code" sortKey="country" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} />
                  <AdminSortableHeader label="Sport" sortKey="sport" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} />
                  <AdminSortableHeader label="Tournaments" sortKey="tournaments" activeKey={sortBy} direction={sortOrder} onSort={toggleSort} />
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
                        <div className="min-w-0 max-w-[16rem]">
                          <p className="truncate text-sm font-semibold" style={{ color: 'var(--admin-text)' }} title={t.name}>{t.name}</p>
                          <p className="mt-0.5 truncate font-mono text-[11px]" style={{ color: 'var(--admin-text-muted)' }} title={t.id}>{t.id}</p>
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
