'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import type { Match } from '../../types/index';
import { fetchMatchesPage, fetchLiveMatches } from '../../services/matches';
import { mergeLiveUpdate, useMatchStream } from '../../hooks/useMatchStream';
import MatchCard from '../MatchCard';
import Tabs from '../Tabs';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import Pagination from '../Pagination';
import AdSlot from '../AdSlot';

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
  const [localSearch, setLocalSearch] = useState(q);
  const liveUpdate = useMatchStream(undefined, tab === 'live');

  useEffect(() => {
    setLocalSearch(q);
  }, [q]);

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

  const handleSearchSubmit = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('q', value);
    else params.delete('q');
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

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-lborder pb-3">
        <Tabs tabs={TABS} active={tab} onChange={handleTabChange} />
        <div className="relative w-full max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stext" />
          <input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearchSubmit(localSearch);
            }}
            placeholder="Search matches…"
            className="w-full rounded-md border border-lborder bg-card py-2 pl-9 pr-3 text-xs text-mtext outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-36 animate-pulse rounded-md border border-lborder bg-card"
            />
          ))}
        </div>
      ) : error ? (
        <ErrorState message="Matches are temporarily unavailable." onRetry={() => setRetryKey((key) => key + 1)} />
      ) : matches.length > 0 ? (
        <>
          <div className="fade-in grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {matches.map((m) => (
              <MatchCard key={m.matchId || m.id} match={m} />
            ))}
          </div>
          <AdSlot slot="matches-below-grid" format="leaderboard" className="pt-2" />
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
