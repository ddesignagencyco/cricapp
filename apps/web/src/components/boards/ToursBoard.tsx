'use client';

import { useMemo } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import SearchField from '../SearchField';
import { str } from '../../utils/extract';
import type { Tour } from '../../types/index';
import { useDebouncedUrlQuery } from '../../hooks/useDebouncedUrlQuery';
import { fetchToursPage } from '../../services/tours';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import Pagination from '../Pagination';
import { DirectoryGridSkeleton } from '../skeletons/Skeletons';
import { filterChipClass, filterChipCountClass } from '../ui/filterChip';
import DirectoryPageHeader from '../DirectoryPageHeader';
import TourCard from '../TourCard';
import { parsePositiveInt, tourKeys } from '../../queries/keys';
import { usePrefetchNextPage, useToursQuery } from '../../queries/useDirectoryQueries';

const LIMIT = 20;
const EMPTY_TOURS: Tour[] = [];

export default function ToursBoard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const { input: localSearch, setInput: setLocalSearch, query: searchQuery } = useDebouncedUrlQuery({ param: 'search' });
  const search = searchQuery.trim();
  const categoryFilter = searchParams.get('category') || 'all';

  const listParams = {
    limit: LIMIT,
    page,
    q: search || undefined,
    category: categoryFilter === 'all' ? undefined : categoryFilter,
  };
  const query = useToursQuery(listParams);
  const tours = query.data?.items ?? EMPTY_TOURS;
  const total = query.data?.total || 0;
  const totalPages = Math.max(1, query.data?.totalPages || Math.ceil(total / LIMIT));

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
    const q = search.toLowerCase();
    if (q) {
      list = list.filter(
        (t) =>
          (t.name || '').toLowerCase().includes(q) ||
          str(t.category).toLowerCase().includes(q) ||
          str(t.sport).toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== 'all') {
      list = list.filter((t) => str(t.category) === categoryFilter);
    }
    return list;
  }, [tours, search, categoryFilter]);

  const activeFilters = categoryFilter !== 'all';

  const nextParams = { ...listParams, page: page + 1 };
  usePrefetchNextPage({
    page,
    totalPages,
    enabled: Boolean(query.data && !query.isPlaceholderData && query.isSuccess),
    queryKey: tourKeys.list(nextParams),
    queryFn: (signal) => fetchToursPage({ page: nextParams.page, limit: nextParams.limit }, signal),
  });

  const updateUrl = (params: URLSearchParams) => {
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const handlePageChange = (next: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next <= 1) params.delete('page');
    else params.set('page', String(next));
    updateUrl(params);
  };

  const handleCategoryFilter = (category: string) => {
    const next = categoryFilter === category ? 'all' : category;
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'all') params.delete('category');
    else params.set('category', next);
    params.delete('page');
    updateUrl(params);
  };

  const clearAll = () => {
    setLocalSearch('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('category');
    params.delete('page');
    updateUrl(params);
  };

  return (
    <div className="space-y-5">
      <DirectoryPageHeader
        eyebrow="International & bilateral series"
        title="Cricket Tours & Series"
        description="Ongoing and scheduled bilateral tours, Test matches, ODI series and domestic championship visits."
        count={total || tours.length}
        countLabel="tours"
      />

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchField
            wrapperClassName="max-w-md flex-1"
            aria-label="Search tours"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search tours by series name, country or category…"
          />
          {(activeFilters || search) && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 rounded border border-lborder bg-card px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-secondary"
            >
              <X size={13} />
              Clear search and filters
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleCategoryFilter('all')}
              aria-pressed={categoryFilter === 'all'}
              className={filterChipClass(categoryFilter === 'all')}
            >
              All Regions
            </button>
            {categories.slice(0, 14).map(([cat, count]) => (
              <button
                key={cat}
                type="button"
                onClick={() => handleCategoryFilter(cat)}
                aria-pressed={categoryFilter === cat}
                className={filterChipClass(categoryFilter === cat)}
              >
                <span>{cat}</span>
                <span className={filterChipCountClass(categoryFilter === cat)}>{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-stext">
        <p>
          Showing <span className="font-semibold text-mtext">{filtered.length}</span> of {total} tour
          {total === 1 ? '' : 's'}
          {search ? ` matching "${search}"` : ''}
        </p>
        {query.isFetching && !query.isPending ? <span>Updating…</span> : null}
      </div>

      {query.isPending ? (
        <DirectoryGridSkeleton />
      ) : query.isError ? (
        <ErrorState message="Tours are temporarily unavailable." onRetry={() => void query.refetch()} />
      ) : filtered.length > 0 ? (
        <>
          <div className="fade-in grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((tour: Tour) => (
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
            search
              ? `No tours match "${search}".`
              : activeFilters
                ? 'No tours match the current category filter.'
                : 'Tours reference data will appear once synced.'
          }
        >
          {search || activeFilters ? (
            <button
              type="button"
              onClick={clearAll}
              className="rounded-md border border-lborder bg-card px-4 py-2 text-sm font-semibold text-mtext transition-colors hover:bg-[var(--color-row-hover)]"
            >
              Clear search and filters
            </button>
          ) : null}
        </EmptyState>
      )}
    </div>
  );
}
