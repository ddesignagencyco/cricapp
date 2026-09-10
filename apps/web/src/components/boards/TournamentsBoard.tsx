'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Calendar, ChevronRight, MapPin, Search, Trophy, X } from 'lucide-react';
import { str } from '../../utils/extract';
import type { TournamentApi } from '../../types/index';
import { fetchTournamentsPage } from '../../services/tournaments';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import Pagination from '../Pagination';

const LIMIT = 20;

interface Props {
  initialCountry?: string;
}

const chipClass = (active: boolean) =>
  `flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
    active
      ? 'btn-brand'
      : 'border border-lborder bg-card text-stext hover:bg-secondary hover:text-mtext'
  }`;

export default function TournamentsBoard({ initialCountry }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const [tournaments, setTournaments] = useState<TournamentApi[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [localSearch, setLocalSearch] = useState('');
  const [formatFilter, setFormatFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState(initialCountry || 'all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchTournamentsPage({ limit: LIMIT, page })
      .then(({ items, total: t }) => {
        if (!cancelled) {
          setTournaments(items);
          setTotal(t);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTournaments([]);
          setTotal(0);
          setError(true);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [page, retryKey]);

  const totalPages = Math.max(1, Math.ceil((total || 0) / LIMIT));

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
    const q = localSearch.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (t) =>
          (t.name || '').toLowerCase().includes(q) ||
          str(t.category).toLowerCase().includes(q) ||
          str(t.type).toLowerCase().includes(q)
      );
    }
    if (formatFilter !== 'all') {
      list = list.filter((t) => str(t.type).toUpperCase() === formatFilter);
    }
    if (categoryFilter !== 'all') {
      list = list.filter((t) => str(t.category) === categoryFilter);
    }
    return list;
  }, [tournaments, localSearch, formatFilter, categoryFilter]);

  const activeFilters = formatFilter !== 'all' || categoryFilter !== 'all';

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
      <header className="rounded-md border border-lborder bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-accent">
              <Trophy size={13} />
              Global competitions & leagues
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-mtext">Cricket Tournaments</h1>
            <p className="mt-1 text-sm leading-relaxed text-stext">
              International trophies, premier T20 leagues, Test championships and domestic cups.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-lborder bg-secondary px-4 py-3">
            <div className="btn-brand grid h-9 w-9 place-items-center rounded-md">
              <Trophy size={18} />
            </div>
            <div>
              <p className="text-lg font-semibold leading-none text-mtext">{total || tournaments.length}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-stext">Competitions</p>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stext"
            />
            <input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search tournaments by title, format or country…"
              className="w-full rounded-md border border-lborder bg-card py-2.5 pl-10 pr-4 text-sm text-mtext outline-none transition-colors focus:border-accent focus:bg-elevated focus:ring-2 focus:ring-accent/20"
            />
          </div>
          {activeFilters && (
            <button
              type="button"
              onClick={() => {
                setFormatFilter('all');
                setCategoryFilter('all');
              }}
              className="inline-flex items-center gap-1.5 rounded border border-lborder bg-card px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-secondary"
            >
              <X size={13} />
              Clear filters
            </button>
          )}
        </div>

        {formats.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => setFormatFilter('all')} className={chipClass(formatFilter === 'all')}>
              All Formats
            </button>
            {formats.map(([fmt, count]) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormatFilter(formatFilter === fmt ? 'all' : fmt)}
                className={chipClass(formatFilter === fmt)}
              >
                <span>{fmt.replace(/_/g, ' ')}</span>
                <span className={formatFilter === fmt ? 'text-white/80' : 'text-stext'}>{count}</span>
              </button>
            ))}
          </div>
        )}

        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => setCategoryFilter('all')} className={chipClass(categoryFilter === 'all')}>
              All Regions
            </button>
            {categories.slice(0, 12).map(([cat, count]) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(categoryFilter === cat ? 'all' : cat)}
                className={chipClass(categoryFilter === cat)}
              >
                <span>{cat}</span>
                <span className={categoryFilter === cat ? 'text-white/80' : 'text-stext'}>{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-stext">
        Showing <span className="font-semibold text-mtext">{filtered.length}</span> of {total} competition
        {total === 1 ? '' : 's'}
      </p>

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-[78px] animate-pulse rounded-md border border-lborder bg-card" />
          ))}
        </div>
      ) : error ? (
        <ErrorState
          message="Tournaments are temporarily unavailable."
          onRetry={() => setRetryKey((key) => key + 1)}
        />
      ) : filtered.length > 0 ? (
        <>
          <div className="fade-in grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
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
          title="No tournaments found"
          message={
            localSearch
              ? 'No competitions match your search. Try another term.'
              : activeFilters
                ? 'No tournaments match these filters. Try clearing them.'
                : 'Tournaments will appear once data syncs.'
          }
        />
      )}
    </div>
  );
}

function TournamentCard({ tournament }: { tournament: TournamentApi }) {
  const category = str(tournament.category) || 'International';
  const season = str(tournament.currentSeason);
  const rawFormat = str(tournament.type).toUpperCase();
  const format = rawFormat ? rawFormat.replace(/_/g, ' ') : 'CRICKET';
  const gender = tournament.gender || '';
  const cs = tournament.currentSeason as Record<string, unknown> | undefined;
  const rawYear = cs?.year || cs?.name;
  const seasonYear =
    typeof rawYear === 'number'
      ? rawYear
      : typeof rawYear === 'string'
        ? (rawYear.match(/(19|20)\d{2}/) || [])[0] || null
        : null;

  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className="group flex items-center gap-3 rounded-md border border-lborder bg-card p-3.5 transition-colors hover:border-accent/50 hover:bg-elevated"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-lborder bg-secondary text-accent">
        <Trophy size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="min-w-0 truncate text-sm font-semibold text-mtext transition-colors group-hover:text-accent" title={tournament.name}>
            {tournament.name}
          </h3>
          <span className="shrink-0 rounded border border-lborder bg-secondary px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-stext">
            {format}
          </span>
        </div>
        <p className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-stext">
          <span className="inline-flex min-w-0 items-center gap-1 truncate">
            <MapPin size={11} className="shrink-0" />
            <span className="truncate">
              {category}
              {gender ? ` · ${gender}` : ''}
            </span>
          </span>
          {(seasonYear || season) && (
            <span className="inline-flex shrink-0 items-center gap-1">
              <Calendar size={11} />
              {seasonYear || season}
            </span>
          )}
        </p>
      </div>
      <ChevronRight size={16} className="shrink-0 text-stext transition-colors group-hover:text-accent" aria-hidden="true" />
    </Link>
  );
}
