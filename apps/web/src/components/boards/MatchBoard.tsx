'use client';

import { Fragment, useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import SearchField from '../SearchField';
import type { Match } from '../../types/index';
import { fetchMatchesPage } from '../../services/matches';
import { useDebouncedUrlQuery } from '../../hooks/useDebouncedUrlQuery';
import { mergeLiveUpdate, useMatchStream } from '../../hooks/useMatchStream';
import MatchCard from '../MatchCard';
import Tabs from '../Tabs';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import PageToolbar from '../PageToolbar';
import Pagination from '../Pagination';
import DummyAd from '../advertisements/DummyAd';
import { MatchCardGridSkeleton } from '../skeletons/Skeletons';
import { matchKeys, parsePositiveInt } from '../../queries/keys';
import { useLiveMatchesQuery, useMatchesQuery, usePrefetchNextPage } from '../../queries/useDirectoryQueries';

const LIMIT = 20;
const EMPTY_MATCHES: Match[] = [];

const TABS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'live', label: 'Live' },
  { key: 'completed', label: 'Completed' },
  { key: 'cancelled', label: 'Cancelled' },
];

export default function MatchBoard() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tab = searchParams.get('tab') || 'upcoming';
  const page = parsePositiveInt(searchParams.get('page'), 1);
  const q = (searchParams.get('q') || '').trim();
  const { input: localSearch, setInput: setLocalSearch } = useDebouncedUrlQuery({ param: 'q' });
  const liveEndpoint = tab === 'live' && !q;
  const listQuery = useMatchesQuery({ status: tab, limit: LIMIT, page, q: q || undefined }, !liveEndpoint);
  const liveQuery = useLiveMatchesQuery(liveEndpoint);
  const activeQuery = liveEndpoint ? liveQuery : listQuery;
  const matches = liveEndpoint ? liveQuery.data || EMPTY_MATCHES : listQuery.data?.items || EMPTY_MATCHES;
  const total = liveEndpoint ? matches.length : listQuery.data?.total || 0;
  const totalPages = liveEndpoint ? 1 : Math.max(1, listQuery.data?.totalPages || Math.ceil(total / LIMIT));
  const [streamMatches, setStreamMatches] = useState<Match[]>([]);
  const liveUpdate = useMatchStream(undefined, tab === 'live');

  useEffect(() => {
    if (liveEndpoint) setStreamMatches(matches);
  }, [liveEndpoint, matches]);

  useEffect(() => {
    if (!liveUpdate || !liveEndpoint) return;
    setStreamMatches((previous) => mergeLiveUpdate(previous, liveUpdate));
  }, [liveUpdate, liveEndpoint]);

  const visibleMatches = liveEndpoint
    ? streamMatches.filter((match) => match.status === 'live')
    : matches;
  const nextParams = { status: tab, limit: LIMIT, page: page + 1, q: q || undefined };

  usePrefetchNextPage({
    page,
    totalPages,
    enabled: !liveEndpoint && Boolean(listQuery.data && !listQuery.isPlaceholderData && listQuery.isSuccess),
    queryKey: matchKeys.list(nextParams),
    queryFn: (signal) => fetchMatchesPage(nextParams, signal),
  });

  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handlePageChange = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete('page');
    else params.set('page', String(p));
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <div className="space-y-5">
      <header>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-accent">Fixtures & results</p>
            <h1 className="mt-1 text-2xl font-semibold text-mtext">Cricket Matches</h1>
            <p className="mt-1 max-w-2xl text-sm text-stext">
              Live scorecards, upcoming fixtures and verified results.
            </p>
          </div>
          <p className="text-xs text-stext">
            <span className="font-semibold text-mtext">{total}</span> {tab}
            {activeQuery.isFetching && !activeQuery.isPending ? ' · Updating…' : ''}
          </p>
        </div>
      </header>

      <PageToolbar
        end={
          <SearchField
            aria-label="Search matches"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search matches…"
          />
        }
      >
        <Tabs tabs={TABS} active={tab} onChange={handleTabChange} />
      </PageToolbar>

      {activeQuery.isPending ? (
        <MatchCardGridSkeleton />
      ) : activeQuery.isError ? (
        <ErrorState
          title="Server unavailable"
          message="Can't reach the API, so matches aren't listed. Start the backend or try again."
          onRetry={() => void activeQuery.refetch()}
        />
      ) : visibleMatches.length > 0 ? (
        <>
          <div className="fade-in grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visibleMatches.map((m, index) => (
              <Fragment key={`${m.matchId || m.id || 'match'}-${index}`}>
                <MatchCard match={m} />
                {visibleMatches.length >= 4 && index === 3 ? (
                  <DummyAd size="medium-rectangle" placement="matches-infeed" inFeed />
                ) : null}
              </Fragment>
            ))}
          </div>
          {!liveEndpoint ? (
            <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={handlePageChange} />
          ) : null}
        </>
      ) : (
        <EmptyState
          title={`No ${tab} matches found`}
          message={
            localSearch || q
              ? `No ${tab} matches match that search.`
              : 'Try switching to a different status tab or check back later for scheduled fixtures.'
          }
        />
      )}
    </div>
  );
}
