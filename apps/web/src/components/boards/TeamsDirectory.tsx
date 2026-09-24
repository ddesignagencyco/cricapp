'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, Users } from 'lucide-react';
import type { Team } from '../../types/index';
import { fetchTeamsPage } from '../../services/teams';
import TeamCard from '../TeamCard';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import Pagination from '../Pagination';
import DummyAd from '../advertisements/DummyAd';
import CompareBoard from './CompareBoard';
import { DirectoryGridSkeleton } from '../skeletons/Skeletons';
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
  const [localSearch, setLocalSearch] = useState(search);

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

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil((total || 0) / LIMIT));
  const filtered = teams;

  const handleSearchSubmit = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    params.delete('page');
    const qs = withColonEntityQuery(params);
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

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
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-lborder bg-card p-6 shadow-sm sm:p-8">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold tracking-wider text-accent border border-accent/20">
              <Users size={13} />
              <span>Global Cricket Directory</span>
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-mtext sm:text-4xl">
              Cricket Teams & Clubs
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-stext sm:text-base">
              Explore national squads, franchise teams, PSL franchises, and domestic rosters with comprehensive player squads and match fixtures.
            </p>
          </div>

          {/* Quick Count Badge */}
          <div className="flex items-center gap-3 rounded-md border border-lborder bg-secondary px-5 py-3.5">
            <div className="btn-brand grid h-11 w-11 place-items-center rounded-md">
              <Users size={20} aria-hidden="true" />
            </div>
            <div>
              <div className="text-2xl font-black tabular-nums text-mtext">{total || teams.length}</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-stext">
                Registered Teams
              </div>
            </div>
          </div>
        </div>
      </div>

      <CompareBoard />

      {!loading && !error && filtered.length > 0 ? (
        <DummyAd size="leaderboard" placement="teams-after-intro" />
      ) : null}

      {/* Search and Filter Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stext"
          />
          <input
            type="search"
            aria-label="Search teams"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearchSubmit(localSearch);
            }}
            placeholder="Search teams by name, abbreviation or country..."
            className="w-full rounded-md border border-lborder bg-card py-2.5 pl-10 pr-4 text-sm text-mtext outline-none transition-colors focus:border-[var(--color-focus-ring)] focus:ring-2 focus:ring-[var(--color-focus-ring)]/30"
          />
        </div>
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
