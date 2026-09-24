'use client';

import { Fragment } from 'react';
import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import SearchField from '../SearchField';
import type { Match } from '../../types/index';
import { fetchMatchesPage, fetchLiveMatches } from '../../services/matches';
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

const LIMIT = 20;

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
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const q = searchParams.get('q') || '';

  const [matches, setMatches] = useState<Match[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const { input: localSearch, setInput: setLocalSearch } = useDebouncedUrlQuery({ param: 'q' });
  const liveUpdate = useMatchStream(undefined, tab === 'live');
  const visibleMatches =
    tab === 'live' ? matches.filter((match) => match.status === 'live') : matches;

  useEffect(() => {
    if (!liveUpdate) return;
    setMatches((prev) => mergeLiveUpdate(prev, liveUpdate));
  }, [liveUpdate]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    const request =
      tab === 'live' && !q
        ? fetchLiveMatches().then((items) => ({ items, total: items.length, totalPages: 1 }))
        : fetchMatchesPage({ status: tab, limit: LIMIT, page, q: q || undefined });
    request
      .then(({ items, total: t }) => {
        if (!cancelled) {
          setMatches(items);
          setTotal(t);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setMatches([]);
          setTotal(0);
          setError(true);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [tab, page, q, retryKey]);

  const totalPages = Math.max(1, Math.ceil((total || 0) / LIMIT));

  const handleTabChange = (newTab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', newTab);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handlePageChange = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(p));
    }
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

      {loading ? (
        <MatchCardGridSkeleton />
      ) : error ? (
        <ErrorState
          title="Server unavailable"
          message="Can't reach the API, so matches aren't listed. Start the backend or try again."
          onRetry={() => setRetryKey((key) => key + 1)}
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
          <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={handlePageChange} />
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
