'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Loader2, Search, Users } from 'lucide-react';
import type { Team } from '../../types/index';
import { fetchTeamsPage } from '../../services/teams';
import TeamCard from '../TeamCard';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import Pagination from '../Pagination';

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
    fetchTeamsPage({ limit: LIMIT, page })
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
  }, [page, retryKey]);

  const totalPages = Math.max(1, Math.ceil((total || 0) / LIMIT));

  const filtered = useMemo(() => {
    const q = localSearch.toLowerCase().trim();
    if (!q) return teams;
    return teams.filter(
      (t) =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.abbr || t.code || '').toLowerCase().includes(q) ||
        (t.country || '').toLowerCase().includes(q) ||
        (t.city || '').toLowerCase().includes(q)
    );
  }, [teams, localSearch]);

  const handleSearchSubmit = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
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
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-lborder bg-gradient-to-br from-card via-card to-elevated p-6 shadow-sm sm:p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent border border-accent/20">
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
          <div className="flex items-center gap-3 rounded-2xl border border-lborder/80 bg-secondary/80 px-5 py-3.5 shadow-inner">
            <div className="grid h-11 w-11 place-items-center rounded-md bg-[var(--color-brand)] text-white">
              <Users size={20} />
            </div>
            <div>
              <div className="text-2xl font-black text-mtext">{total || teams.length}</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-stext">
                Registered Teams
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stext"
          />
          <input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearchSubmit(localSearch);
            }}
            placeholder="Search teams by name, abbreviation or country..."
            className="w-full rounded-2xl border border-lborder bg-card py-2.5 pl-10 pr-4 text-xs text-mtext outline-none transition focus:border-accent focus:bg-elevated focus:ring-2 focus:ring-accent/20"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-stext">
          <span>Showing</span>
          <span className="font-bold text-mtext">{filtered.length}</span>
          <span>of {total} teams</span>
        </div>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[74px] animate-pulse rounded-md border border-lborder bg-card" />
          ))}
        </div>
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
