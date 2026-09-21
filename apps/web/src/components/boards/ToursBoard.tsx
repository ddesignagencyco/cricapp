'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, Trophy, X } from 'lucide-react';
import { str } from '../../utils/extract';
import type { Tour } from '../../types/index';
import { fetchToursPage } from '../../services/tours';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import Pagination from '../Pagination';
import { DirectoryGridSkeleton } from '../skeletons/Skeletons';
import { filterChipClass, filterChipCountClass } from '../ui/filterChip';
import TourCard from '../TourCard';

const LIMIT = 20;

export default function ToursBoard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const [tours, setTours] = useState<Tour[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchToursPage({ limit: LIMIT, page })
      .then(({ items, total: nextTotal }) => {
        if (cancelled) return;
        setTours(items);
        setTotal(nextTotal);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setTours([]);
        setTotal(0);
        setError(true);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, retryKey]);

  const totalPages = Math.max(1, Math.ceil((total || 0) / LIMIT));

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    tours.forEach((t) => {
      const c = str(t.category) || 'International';
      map.set(c, (map.get(c) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [tours]);

  const filtered = useMemo(() => {
    let list = tours;
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (t) =>
          (t.name || '').toLowerCase().includes(q) ||
          str(t.category).toLowerCase().includes(q) ||
          str(t.sport).toLowerCase().includes(q)
      );
    }
    if (countryFilter !== 'all') {
      list = list.filter((t) => str(t.category) === countryFilter);
    }
    return list;
  }, [tours, search, countryFilter]);

  const activeFilters = countryFilter !== 'all';

  const handlePageChange = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete('page');
    else params.set('page', String(next));
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  return (
    <div className="space-y-5">
      <header className="rounded-md border border-lborder bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-accent">
              <Trophy size={13} />
              International & bilateral series
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-mtext">Cricket Tours & Series</h1>
            <p className="mt-1 text-sm leading-relaxed text-stext">
              Ongoing and scheduled bilateral tours, Test matches, ODI series and domestic championship visits.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-lborder bg-secondary px-4 py-3">
            <div className="btn-brand grid h-9 w-9 place-items-center rounded-md">
              <Trophy size={18} />
            </div>
            <div>
              <p className="text-lg font-semibold leading-none text-mtext">{total || tours.length}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-stext">Tours</p>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search
              size={16}
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stext"
            />
            <input
              type="search"
              aria-label="Search tours"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tours by series name, country or category…"
              className="w-full rounded-md border border-lborder bg-card py-2.5 pl-10 pr-4 text-sm text-mtext outline-none transition-colors focus:border-[var(--color-focus-ring)] focus:bg-elevated focus:ring-2 focus:ring-[var(--color-focus-ring)]/30"
            />
          </div>
          {activeFilters && (
            <button
              type="button"
              onClick={() => setCountryFilter('all')}
              className="inline-flex items-center gap-1.5 rounded border border-lborder bg-card px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-secondary"
            >
              <X size={13} />
              Clear filters
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCountryFilter('all')}
              aria-pressed={countryFilter === 'all'}
              className={filterChipClass(countryFilter === 'all')}
            >
              All Regions
            </button>
            {categories.slice(0, 14).map(([cat, count]) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCountryFilter(countryFilter === cat ? 'all' : cat)}
                aria-pressed={countryFilter === cat}
                className={filterChipClass(countryFilter === cat)}
              >
                <span>{cat}</span>
                <span className={filterChipCountClass(countryFilter === cat)}>{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-stext">
        Showing <span className="font-semibold text-mtext">{filtered.length}</span> of {total} tour
        {total === 1 ? '' : 's'}
      </p>

      {loading ? (
        <DirectoryGridSkeleton />
      ) : error ? (
        <ErrorState
          message="Tours are temporarily unavailable."
          onRetry={() => setRetryKey((key) => key + 1)}
        />
      ) : filtered.length > 0 ? (
        <>
          <div className="fade-in grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
          <div className="pt-4">
            <Pagination
              page={page}
              totalPages={totalPages}
              total={total}
              limit={LIMIT}
              onPageChange={handlePageChange}
            />
          </div>
        </>
      ) : (
        <EmptyState
          title="No cricket tours found"
          message={
            search || activeFilters
              ? 'No tours match your current filters. Try clearing them.'
              : 'Tours reference data will appear once synced.'
          }
        />
      )}
    </div>
  );
}
