'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Calendar, Filter, Loader2, MapPin, Search, Trophy, X } from 'lucide-react';
import { str } from '../../utils/extract';
import type { TournamentApi } from '../../types/index';
import { fetchTournamentsPage } from '../../services/tournaments';
import EmptyState from '../EmptyState';
import Pagination from '../Pagination';

const LIMIT = 20;

interface Props {
  initialCountry?: string;
}

export default function TournamentsBoard({ initialCountry }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const [tournaments, setTournaments] = useState<TournamentApi[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState('');
  const [formatFilter, setFormatFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState(initialCountry || 'all');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
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
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [page]);

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
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-lborder bg-gradient-to-br from-card via-card to-elevated p-6 shadow-sm sm:p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent border border-accent/20">
              <Trophy size={13} />
              <span>Global Competitions & Leagues</span>
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-mtext sm:text-4xl">
              Cricket Tournaments
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-stext sm:text-base">
              Explore international ICC trophies, premier T20 leagues (PSL, IPL, BBL), test championships, and prestigious domestic cups.
            </p>
          </div>

          {/* Quick Count Badge */}
          <div className="flex items-center gap-3 rounded-2xl border border-lborder/80 bg-secondary/80 px-5 py-3.5 shadow-inner">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-white shadow-sm">
              <Trophy size={20} />
            </div>
            <div>
              <div className="text-2xl font-black text-mtext">{total || tournaments.length}</div>
              <div className="text-xs font-semibold uppercase tracking-wider text-stext">
                Competitions
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stext"
            />
            <input
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search tournaments by title, format, or country..."
              className="w-full rounded-2xl border border-lborder bg-card py-2.5 pl-10 pr-4 text-xs text-mtext outline-none transition focus:border-accent focus:bg-elevated focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {activeFilters && (
            <button
              type="button"
              onClick={() => {
                setFormatFilter('all');
                setCategoryFilter('all');
              }}
              className="flex items-center gap-1.5 rounded-xl border border-lborder bg-card px-3.5 py-2 text-xs font-bold text-accent transition-colors hover:bg-secondary cursor-pointer"
            >
              <X size={13} />
              <span>Clear filters</span>
            </button>
          )}
        </div>

        {/* Format Chips */}
        {formats.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setFormatFilter('all')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                formatFilter === 'all'
                  ? 'bg-accent text-white shadow-md shadow-accent/20'
                  : 'border border-lborder bg-card text-stext hover:text-mtext hover:bg-secondary'
              }`}
            >
              All Formats
            </button>
            {formats.map(([fmt, count]) => (
              <button
                key={fmt}
                type="button"
                onClick={() => setFormatFilter(formatFilter === fmt ? 'all' : fmt)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  formatFilter === fmt
                    ? 'bg-accent text-white shadow-md shadow-accent/20'
                    : 'border border-lborder bg-card text-stext hover:text-mtext hover:bg-secondary'
                }`}
              >
                <span>{fmt.replace(/_/g, ' ')}</span>
                <span
                  className={`rounded-md px-1.5 py-0.2 text-xs font-semibold ${
                    formatFilter === fmt ? 'bg-white/20 text-white' : 'bg-secondary text-stext'
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Country/Region Chips */}
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-accent2 text-white shadow-md shadow-accent2/20'
                  : 'border border-lborder bg-card text-stext hover:text-mtext hover:bg-secondary'
              }`}
            >
              All Regions
            </button>
            {categories.slice(0, 12).map(([cat, count]) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(categoryFilter === cat ? 'all' : cat)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  categoryFilter === cat
                    ? 'bg-accent2 text-white shadow-md shadow-accent2/20'
                    : 'border border-lborder bg-card text-stext hover:text-mtext hover:bg-secondary'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`rounded-md px-1.5 py-0.2 text-xs font-semibold ${
                    categoryFilter === cat ? 'bg-white/20 text-white' : 'bg-secondary text-stext'
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Showing count */}
      <div className="flex items-center justify-between text-xs text-stext">
        <p>
          Showing <span className="font-bold text-mtext">{filtered.length}</span> of {total} competition{total === 1 ? '' : 's'}
        </p>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-3xl border border-lborder bg-card p-12 text-center">
          <Loader2 className="animate-spin text-accent" size={32} />
          <p className="text-xs font-semibold text-stext">Loading cricket tournaments…</p>
        </div>
      ) : filtered.length > 0 ? (
        <>
          <div className="fade-in grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((tournament) => (
              <TournamentCard key={tournament.id} tournament={tournament} />
            ))}
          </div>
          <div className="pt-6">
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </div>
        </>
      ) : (
        <EmptyState
          title="No tournaments found"
          message={
            localSearch
              ? 'No competitions match your search query. Try another term.'
              : activeFilters
              ? 'No tournaments match these selected filters. Try clearing filters.'
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
  const startDate = cs?.start_date || cs?.startDate;
  const endDate = cs?.end_date || cs?.endDate;
  const dateRange = startDate && endDate ? `${startDate} → ${endDate}` : startDate || endDate ? String(startDate || endDate) : '';
  const rawYear = cs?.year || cs?.name;
  const seasonYear = typeof rawYear === 'number' ? rawYear : typeof rawYear === 'string' ? (rawYear.match(/(19|20)\d{2}/) || [])[0] || null : null;

  return (
    <Link
      href={`/tournaments/${tournament.id}`}
      className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-lborder bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:bg-elevated hover:shadow-xl hover:shadow-accent/10"
    >
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-accent border border-accent/20">
            {format}
          </span>

          {seasonYear && (
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-black tracking-wider text-stext border border-lborder/60">
              {seasonYear}
            </span>
          )}
        </div>

        {/* Tournament Name */}
        <div className="mt-4 flex items-start gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20 group-hover:scale-105 transition-transform">
            <Trophy size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-base font-bold leading-snug text-mtext transition-colors group-hover:text-accent" title={tournament.name}>
              {tournament.name}
            </h3>
            {category && (
              <p className="mt-1 flex items-center gap-1 text-xs text-stext font-medium">
                <MapPin size={11} className="text-accent shrink-0" />
                <span className="truncate">{category}</span>
                {gender && <span className="capitalize text-stext/70">· {gender}</span>}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="mt-6 flex items-center justify-between border-t border-lborder/60 pt-3 text-xs">
        {season ? (
          <span className="flex items-center gap-1 text-xs text-stext truncate max-w-[170px]">
            <Calendar size={11} className="shrink-0" />
            <span className="truncate">{season}</span>
          </span>
        ) : (
          <span className="text-xs text-stext">Competition</span>
        )}

        <span className="inline-flex items-center gap-1 font-bold text-accent transition-transform duration-300 group-hover:translate-x-1">
          <span>Standings</span>
          <span>→</span>
        </span>
      </div>
    </Link>
  );
}
