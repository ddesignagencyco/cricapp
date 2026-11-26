'use client';

import { Fragment } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import SearchField from '../SearchField';
import type { Team } from '../../types/index';
import { fetchTeamsPage } from '../../services/teams';
import DirectoryPageHeader from '../DirectoryPageHeader';
import TeamCard from '../TeamCard';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import Pagination from '../Pagination';
import AdSlot from '../advertisements/AdSlot';
import EditorialSidebar from './EditorialSidebar';

import { DirectoryGridSkeleton } from '../skeletons/Skeletons';
import { useDebouncedUrlQuery } from '../../hooks/useDebouncedUrlQuery';
import { withColonEntityQuery } from '../../utils/entityId';
import { teamKeys, parsePositiveInt } from '../../queries/keys';
import { usePrefetchNextPage, useTeamsQuery } from '../../queries/useDirectoryQueries';

/**
 * 24 = 3 cards per row × 8 rows, matching the `xl:grid-cols-3` grid below. The API
 * default is 20, which leaves two orphans stranded on the last row.
 */
const LIMIT = 24;

export default function TeamsDirectory() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = parsePositiveInt(searchParams.get('page'), 1);
  const { input: localSearch, setInput: setLocalSearch, query: searchQuery } = useDebouncedUrlQuery({
    param: 'search',
    serializeParams: withColonEntityQuery,
  });
  const search = searchQuery.trim();

  const listParams = { limit: LIMIT, page, q: search || undefined };
  const query = useTeamsQuery(listParams);
  const teams = query.data?.items || [];
  const total = query.data?.total || 0;
  const totalPages = Math.max(1, query.data?.totalPages || Math.ceil(total / LIMIT));

  const nextParams = { ...listParams, page: page + 1 };
  usePrefetchNextPage({
    page,
    totalPages,
    enabled: Boolean(query.data && !query.isPlaceholderData && query.isSuccess),
    queryKey: teamKeys.list(nextParams),
    queryFn: (signal) => fetchTeamsPage(nextParams, signal),
  });

  const handlePageChange = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete('page');
    else params.set('page', String(p));
    const qs = withColonEntityQuery(params);
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const clearSearch = () => {
    setLocalSearch('');
    if (page !== 1) handlePageChange(1);
  };

  return (
    <div className="space-y-5">
      <DirectoryPageHeader
        eyebrow="Global cricket directory"
        title="Cricket Teams & Clubs"
        description="National squads, franchise teams, PSL franchises, and domestic rosters with squads and fixtures."
        count={total || teams.length}
        countLabel="teams"
      />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchField
          wrapperClassName="max-w-md flex-1"
          aria-label="Search teams"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search teams by name, abbreviation or country..."
        />
      </div>

      <div className="flex items-center justify-between text-xs text-stext">
        <p>
          Showing <span className="font-semibold text-mtext">{teams.length}</span> of {total} team{total === 1 ? '' : 's'}
          {search ? ` matching "${search}"` : ''}
        </p>
        {query.isFetching && !query.isPending ? <span>Updating…</span> : null}
      </div>

      {query.isPending ? (
        <DirectoryGridSkeleton count={6} />
      ) : query.isError ? (
        <ErrorState message="Teams are temporarily unavailable." onRetry={() => void query.refetch()} />
      ) : teams.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-stretch">
          <div className="flex min-w-0 flex-col">
            <div className="fade-in grid grid-cols-1 gap-3 sm:grid-cols-2">
              {teams.map((t: Team, index) => (
                <Fragment key={t.id}>
                  <TeamCard team={t} />
                  {(index + 1) % 6 === 0 && index < teams.length - 1 ? (
                    <div className="col-span-full py-1">
                      <AdSlot placement="teams-infeed" />
                    </div>
                  ) : null}
                </Fragment>
              ))}
            </div>

            <div className="mt-auto pt-6">
              <Pagination className="mt-0" page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={handlePageChange} />
            </div>
          </div>
          <EditorialSidebar
            topPlacement={teams.length >= 16 ? 'teams-skyscraper' : 'teams-sidebar'}
            bottomPlacement={teams.length >= 18 ? 'teams-sidebar' : undefined}
            variant="directory"
          />
        </div>
      ) : (
        <EmptyState
          title="No cricket teams found"
          message={search ? `No teams match "${search}".` : 'No teams currently registered in this directory.'}
        >
          {search ? (
            <button
              type="button"
              onClick={clearSearch}
              className="rounded-md border border-lborder bg-card px-4 py-2 text-sm font-semibold text-mtext transition-colors hover:bg-[var(--color-row-hover)]"
            >
              Clear search
            </button>
          ) : null}
        </EmptyState>
      )}
    </div>
  );
}
