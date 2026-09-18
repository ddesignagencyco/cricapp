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
import { DirectoryGridSkeleton } from '../skeletons/Skeletons';
import { filterChipClass, filterChipCountClass } from '../ui/filterChip';
import FavoriteButton from '../FavoriteButton';
import ShareButton from '../ShareButton';

const LIMIT = 20;

interface Props {
  initialCountry?: string;
}

export default function TournamentsBoard({ initialCountry }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const search = searchParams.get('q') || searchParams.get('search') || '';

  const [tournaments, setTournaments] = useState<TournamentApi[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [localSearch, setLocalSearch] = useState(search);
  const [formatFilter, setFormatFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState(initialCountry || 'all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetchTournamentsPage({ limit: LIMIT, page, q: search || undefined })
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
  }, [page, search, retryKey]);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

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
    if (formatFilter !== 'all') {
      list = list.filter((t) => str(t.type).toUpperCase() === formatFilter);
    }
    if (categoryFilter !== 'all') {
      list = list.filter((t) => str(t.category) === categoryFilter);
    }
    return list;
  }, [tournaments, formatFilter, categoryFilter]);

  const activeFilters = formatFilter !== 'all' || categoryFilter !== 'all';

  const handleSearchSubmit = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('q', value);
    else {
      params.delete('q');
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
              aria-hidden="true"
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stext"
            />
            <input
              type="search"
              aria-label="Search tournaments"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearchSubmit(localSearch);
              }}
              placeholder="Search tournaments by title, format or country…"
              className="w-full rounded-md border border-lborder bg-card py-2.5 pl-10 pr-4 text-sm text-mtext outline-none transition-colors focus:border-[var(--color-focus-ring)] focus:bg-elevated focus:ring-2 focus:ring-[var(--color-focus-ring)]/30"
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
                onClick={() => setFormatFilter(formatFilter === fmt ? 'all' : fmt)}
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
              onClick={() => setCategoryFilter('all')}
              aria-pressed={categoryFilter === 'all'}
              className={filterChipClass(categoryFilter === 'all')}
            >
              All Regions
            </button>
            {categories.slice(0, 12).map(([cat, count]) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(categoryFilter === cat ? 'all' : cat)}
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

      <p className="text-xs text-stext">
        Showing <span className="font-semibold text-mtext">{filtered.length}</span> of {total} competition
        {total === 1 ? '' : 's'}
      </p>

      {loading ? (
        <DirectoryGridSkeleton />
      ) : error ? (
        <ErrorState
          message="Tournaments are temporarily unavailable."
          onRetry={() => setRetryKey((key) => key + 1)}
        />
      ) : filtered.length > 0 ? (
        <>
          <div className="fade-in grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
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

function hueFromName(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash % 360);
}

function TournamentCard({ tournament }: { tournament: TournamentApi }) {
  const category = str(tournament.category) || 'International';
  const season = str(tournament.currentSeason);
  const rawFormat = str(tournament.type).toUpperCase();
  const format = rawFormat ? rawFormat.replace(/_/g, ' ') : 'CRICKET';
  const gender = tournament.gender || '';
  const href = `/tournaments/${tournament.id}`;
  const hue = hueFromName(tournament.name || category);
  const cs = tournament.currentSeason as Record<string, unknown> | undefined;
  const rawYear = cs?.year || cs?.name;
  const seasonYear =
    typeof rawYear === 'number'
      ? rawYear
      : typeof rawYear === 'string'
        ? (rawYear.match(/(19|20)\d{2}/) || [])[0] || null
        : null;

  return (
    <article className="elev-card group flex h-full flex-col rounded-md border border-lborder bg-card p-4 transition-colors hover:border-accent/50 hover:bg-[var(--color-row-hover)]">
      <Link href={href} className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start gap-3">
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-md text-white"
            style={{
              backgroundImage: `linear-gradient(135deg, hsl(${hue}, 68%, 46%), hsl(${(hue + 38) % 360}, 72%, 32%))`,
            }}
            aria-hidden="true"
          >
            <Trophy size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-mtext transition-colors group-hover:text-accent">
              {tournament.name}
            </h3>
            <p className="mt-1.5 flex min-w-0 items-center gap-1 text-xs text-stext">
              <MapPin size={11} className="shrink-0" />
              <span className="truncate">
                {category}
                {gender ? ` · ${gender}` : ''}
              </span>
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="rounded border border-lborder bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-stext">
            {format}
          </span>
          {(seasonYear || season) ? (
            <span className="inline-flex items-center gap-1 text-xs text-stext">
              <Calendar size={11} />
              {seasonYear || season}
            </span>
          ) : null}
        </div>
      </Link>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-lborder pt-3">
        <div className="flex items-center gap-1">
          <FavoriteButton targetType="tournament" targetId={tournament.id} compact />
          <ShareButton
            type="tournament"
            id={tournament.id}
            fallbackTitle={tournament.name}
            href={`/tournaments/${encodeURIComponent(tournament.id)}`}
            compact
          />
        </div>
        <Link href={href} className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
          View
          <ChevronRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}
