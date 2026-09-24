'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import SearchField from '../SearchField';
import type { Team } from '../../types/index';
import { fetchTeamsPage } from '../../services/teams';
import DirectoryPageHeader from '../DirectoryPageHeader';
import TeamCard from '../TeamCard';
import { cardDiamond } from '../ui/interaction';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import Pagination from '../Pagination';
import DummyAd from '../advertisements/DummyAd';
import dynamic from 'next/dynamic';

const CompareBoard = dynamic(() => import('./CompareBoard'), { ssr: false });
import { DirectoryGridSkeleton } from '../skeletons/Skeletons';
import { useDebouncedUrlQuery } from '../../hooks/useDebouncedUrlQuery';
import { withColonEntityQuery } from '../../utils/entityId';

const LIMIT = 20;

export default function TeamsDirectory() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const search = searchParams.get('search') || '';

  const [teams, setTeams] = useState<Team[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const { input: localSearch, setInput: setLocalSearch } = useDebouncedUrlQuery({
    param: 'search',
    serializeParams: withColonEntityQuery,
  });
  const [compareOpen, setCompareOpen] = useState(() => {
    const a = searchParams.get('a');
    const b = searchParams.get('b');
    return Boolean(a || b);
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchTeamsPage({ limit: LIMIT, page, q: search || undefined })
      .then(({ items, total: t }) => {
        if (!cancelled) {
          setTeams(items);
          setTotal(t);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTeams([]);
          setTotal(0);
          setError(true);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [page, search, retryKey]);

  const totalPages = Math.max(1, Math.ceil((total || 0) / LIMIT));
  const filtered = teams;

  const handlePageChange = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(p));
    }
    const qs = withColonEntityQuery(params);
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
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

      <div className={`${cardDiamond} p-4`}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold text-mtext">Compare teams</p>
            <p className="text-xs text-stext">Head-to-head records and fixture history between any two sides.</p>
          </div>
          {!compareOpen ? (
            <button
              type="button"
              onClick={() => setCompareOpen(true)}
              className="btn-secondary shrink-0 rounded-md px-4 py-2 text-xs font-semibold"
            >
              Open compare
            </button>
          ) : null}
        </div>
        {compareOpen ? (
          <div className="mt-4 border-t border-lborder pt-4">
            <CompareBoard />
          </div>
        ) : null}
      </div>

      {!loading && !error && filtered.length > 0 ? (
        <DummyAd size="leaderboard" placement="teams-after-intro" />
      ) : null}

      {/* Search and Filter Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchField
          wrapperClassName="max-w-md flex-1"
          aria-label="Search teams"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search teams by name, abbreviation or country..."
        />
      </div>

      {/* Grid Content */}
      {loading ? (
        <DirectoryGridSkeleton count={6} />
      ) : error ? (
        <ErrorState message="Teams are temporarily unavailable." onRetry={() => setRetryKey((key) => key + 1)} />
      ) : filtered.length > 0 ? (
        <>
          <div className="fade-in grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((t) => (
              <TeamCard key={t.id} team={t} />
            ))}
          </div>

          <div className="pt-4">
            <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={handlePageChange} />
          </div>
        </>
      ) : (
        <EmptyState
          title="No cricket teams found"
          message={
            localSearch
              ? `No teams match "${localSearch}". Try searching for another name or clear your search.`
              : 'No teams currently registered in this directory.'
          }
        />
      )}
    </div>
  );
}
