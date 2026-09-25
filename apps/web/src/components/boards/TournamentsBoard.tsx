'use client';

import { useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import SearchField from '../SearchField';
import { str } from '../../utils/extract';
import type { TournamentApi } from '../../types/index';
import { useDebouncedUrlQuery } from '../../hooks/useDebouncedUrlQuery';
import { fetchTournamentsPage } from '../../services/tournaments';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import Pagination from '../Pagination';
import { DirectoryGridSkeleton } from '../skeletons/Skeletons';
import { filterChipClass, filterChipCountClass } from '../ui/filterChip';
import DirectoryPageHeader from '../DirectoryPageHeader';
import TournamentCard from '../TournamentCard';
import { parsePositiveInt, tournamentKeys } from '../../queries/keys';
import { usePrefetchNextPage, useTournamentsQuery } from '../../queries/useDirectoryQueries';

const LIMIT = 20;
const EMPTY_TOURNAMENTS: TournamentApi[] = [];

interface Props {
  initialCountry?: string;
}

export default function TournamentsBoard({ initialCountry }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = parsePositiveInt(searchParams.get('page'), 1);
  const { input: localSearch, setInput: setLocalSearch, query: searchQuery } = useDebouncedUrlQuery({ param: 'q' });
  const search = searchQuery.trim();
  const categoryFilter = searchParams.get('country') || initialCountry || 'all';
  const [formatFilter, setFormatFilter] = useState('all');

  const listParams = {
    limit: LIMIT,
    page,
    q: search || undefined,
    country: categoryFilter === 'all' ? undefined : categoryFilter,
    format: formatFilter === 'all' ? undefined : formatFilter,
  };
  const query = useTournamentsQuery(listParams);
  const tournaments = query.data?.items ?? EMPTY_TOURNAMENTS;
  const total = query.data?.total || 0;
  const totalPages = Math.max(1, query.data?.totalPages || Math.ceil(total / LIMIT));

  const formats = useMemo(() => {
    const map = new Map<string, number>();
    tournaments.forEach((t) => {
      const f = str(t.type).toUpperCase() || 'Other';
      map.set(f, (map.get(f) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [tournaments]);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    tournaments.forEach((t) => {
      const c = str(t.category) || 'International';
      map.set(c, (map.get(c) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [tournaments]);

  const filtered = useMemo(() => {
    let list = tournaments;
    if (formatFilter !== 'all') {
      list = list.filter((t) => str(t.type).toUpperCase() === formatFilter);
    }
    if (categoryFilter !== 'all') {
      list = list.filter((t) => str(t.category) === categoryFilter);
    }
    return list;
  }, [tournaments, formatFilter, categoryFilter]);

  const activeFilters = formatFilter !== 'all' || categoryFilter !== 'all';

  const nextParams = { ...listParams, page: page + 1 };
  usePrefetchNextPage({
    page,
    totalPages,
    enabled: Boolean(query.data && !query.isPlaceholderData && query.isSuccess),
    queryKey: tournamentKeys.list(nextParams),
    queryFn: (signal) =>
      fetchTournamentsPage({ page: nextParams.page, limit: nextParams.limit, q: nextParams.q }, signal),
  });

  const updateUrl = (params: URLSearchParams) => {
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const handlePageChange = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete('page');
    else params.set('page', String(p));
    updateUrl(params);
  };

  const handleCategoryFilter = (category: string) => {
    const next = categoryFilter === category ? 'all' : category;
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'all') params.delete('country');
    else params.set('country', next);
    params.delete('page');
    updateUrl(params);
  };

  const handleFormatFilter = (format: string) => {
    const next = formatFilter === format ? 'all' : format;
    setFormatFilter(next);
    if (page !== 1) handlePageChange(1);
  };

  const clearAll = () => {
    setFormatFilter('all');
    setLocalSearch('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('country');
    params.delete('page');
    updateUrl(params);
  };

  return (
    <div className="space-y-5">
      <DirectoryPageHeader
        eyebrow="Global competitions & leagues"
        title="Cricket Tournaments"
        description="International trophies, premier T20 leagues, Test championships and domestic cups."
        count={total || tournaments.length}
        countLabel="competitions"
      />

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <SearchField
            wrapperClassName="max-w-md flex-1"
            aria-label="Search tournaments"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search tournaments by title, format or country…"
          />
          {activeFilters && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 rounded border border-lborder bg-card px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-secondary"
            >
              <X size={13} />
              Clear filters
            </button>
          )}
        </div>

        {formats.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setFormatFilter('all')}
              aria-pressed={formatFilter === 'all'}
              className={filterChipClass(formatFilter === 'all')}
            >
              All Formats
            </button>
            {formats.map(([fmt, count]) => (
              <button
                key={fmt}
                type="button"
                onClick={() => handleFormatFilter(fmt)}
                aria-pressed={formatFilter === fmt}
                className={filterChipClass(formatFilter === fmt)}
              >
                <span>{fmt.replace(/_/g, ' ')}</span>
                <span className={filterChipCountClass(formatFilter === fmt)}>{count}</span>
              </button>
            ))}
          </div>
        )}

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
            {categories.slice(0, 12).map(([cat, count]) => (
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
          Showing <span className="font-semibold text-mtext">{filtered.length}</span> of {total} competition
          {total === 1 ? '' : 's'}
          {search ? ` matching "${search}"` : ''}
        </p>
        {query.isFetching && !query.isPending ? <span>Updating…</span> : null}
      </div>

      {query.isPending ? (
        <DirectoryGridSkeleton />
      ) : query.isError ? (
        <ErrorState message="Tournaments are temporarily unavailable." onRetry={() => void query.refetch()} />
      ) : filtered.length > 0 ? (
        <>
          <div className="fade-in grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((tournament: TournamentApi) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>

          <div className="pt-4">
            <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={handlePageChange} />
          </div>
        </>
      ) : (
        <EmptyState
          title="No tournaments found"
          message={
            search
              ? `No competitions match "${search}".`
              : activeFilters
                ? 'No tournaments match these filters.'
                : 'Tournaments will appear once data syncs.'
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
