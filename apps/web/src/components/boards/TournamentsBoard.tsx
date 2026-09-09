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
    <>
      <header className="mb-6">
        <div className="flex items-center gap-2 text-accent">
          <Trophy size={18} />
          <span className="text-xs font-bold uppercase tracking-widest text-stext">
            Tournaments & Competitions
          </span>
        </div>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Tournaments</h1>
        <p className="mt-2 text-sm text-stext">
          All cricket competitions — domestic leagues, international tournaments and series.
        </p>
      </header>

      <div className="mb-6 max-w-xl">
        <div className="flex items-center gap-2 rounded-xl bg-card px-3.5 py-3 ring-1 ring-lborder focus-within:ring-accent/50">
          <Search size={17} className="shrink-0 text-stext" />
          <input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search tournaments by name, format or country..."
            className="w-full bg-transparent text-sm text-mtext placeholder:text-stext focus:outline-none"
          />
        </div>
      </div>

      <div className="mb-6 rounded-2xl bg-card p-4 ring-1 ring-lborder">
        <div className="mb-3 flex items-center gap-2">
          <Filter size={14} className="text-accent" />
          <span className="text-xs font-bold uppercase tracking-widest text-stext">Filters</span>
          {activeFilters && (
            <button
              type="button"
              onClick={() => { setFormatFilter('all'); setCategoryFilter('all'); }}
              className="ml-auto flex items-center gap-1 text-[11px] font-bold text-accent hover:underline"
            >
              <X size={12} /> Clear all
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFormatFilter('all')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              formatFilter === 'all'
                ? 'bg-accent/15 text-accent ring-1 ring-inset ring-accent/25'
                : 'bg-elevated text-stext ring-1 ring-lborder hover:text-mtext'
            }`}
          >
            All Formats
          </button>
          {formats.map(([fmt]) => (
            <button
              key={fmt}
              type="button"
              onClick={() => setFormatFilter(formatFilter === fmt ? 'all' : fmt)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                formatFilter === fmt
                  ? 'bg-accent/15 text-accent ring-1 ring-inset ring-accent/25'
                  : 'bg-elevated text-stext ring-1 ring-lborder hover:text-mtext'
              }`}
            >
              {fmt.replace('_', ' ')}
            </button>
          ))}
        </div>

        {categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {categories.slice(0, 12).map(([cat, count]) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(categoryFilter === cat ? 'all' : cat)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                  categoryFilter === cat
                    ? 'bg-accent2/15 text-accent2 ring-1 ring-inset ring-accent2/30'
                    : 'bg-elevated text-stext ring-1 ring-lborder hover:text-mtext'
                }`}
              >
                <MapPin size={11} />
                {cat}
                <span className="text-stext/60">({count})</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-stext">
            {filtered.length} tournament{filtered.length === 1 ? '' : 's'}
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="animate-spin text-accent" size={32} />
          </div>
        ) : filtered.length > 0 ? (
          <>
            <div className="fade-in grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filtered.map((tournament) => (
                <TournamentCard key={tournament.id} tournament={tournament} />
              ))}
            </div>
            <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
          </>
        ) : (
          <EmptyState
            title="No tournaments found"
            message={
              localSearch
                ? 'No tournaments match your search. Try a different query.'
                : activeFilters
                  ? 'Nothing in this slot. Try clearing filters.'
                  : 'Tournaments will appear once reference data syncs.'
            }
          />
        )}
      </div>
    </>
  );
}

function TournamentCard({ tournament }: { tournament: TournamentApi }) {
  const category = str(tournament.category) || 'International';
  const season = str(tournament.currentSeason);
  const format = str(tournament.type).toUpperCase();
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
      className="group flex h-48 flex-col overflow-hidden rounded-2xl bg-card p-5 ring-1 ring-lborder transition-all duration-300 hover:-translate-y-1 hover:bg-elevated hover:ring-accent/40 hover:shadow-lg"
    >
      <div className="mb-3 flex items-start justify-between gap-3 shrink-0">
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-base font-bold text-mtext group-hover:text-accent transition-colors" title={tournament.name}>
            {tournament.name}
          </h3>
        </div>
        {seasonYear && (
          <span className="shrink-0 rounded-full bg-accent2/15 px-2 py-0.5 text-[10px] font-bold text-accent2 ring-1 ring-inset ring-accent2/25">
            {seasonYear}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs text-stext shrink-0">
        {format && (
          <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2 py-0.5 font-semibold text-accent ring-1 ring-inset ring-accent/20">
            {format.replace('_', ' ')}
          </span>
        )}
        {gender && (
          <span className="inline-flex items-center gap-1 rounded-full bg-elevated px-2 py-0.5 ring-1 ring-lborder capitalize">
            {gender}
          </span>
        )}
        {category && (
          <span className="inline-flex items-center gap-1 rounded-full bg-elevated px-2 py-0.5 ring-1 ring-lborder">
            <MapPin size={11} className="text-accent" />
            <span className="truncate max-w-[80px]">{category}</span>
          </span>
        )}
      </div>

      <div className="mt-auto pt-3 border-t border-lborder/50 shrink-0">
        {season && (
          <p className="flex items-center gap-1.5 text-xs text-stext">
            <Calendar size={12} className="shrink-0 text-stext/60" />
            <span className="truncate">{season}</span>
          </p>
        )}
        {dateRange && <p className="mt-1.5 truncate text-[11px] font-medium text-stext/70">{dateRange}</p>}
      </div>
    </Link>
  );
}
