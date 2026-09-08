'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Calendar, ChevronLeft, ChevronRight, Filter, Loader2, MapPin, Search, Trophy, X } from 'lucide-react';
import EmptyState from '../EmptyState';
import { fetchTournaments } from '../../services/tournaments';

function getCategoryName(cat: any): string {
  if (!cat) return '';
  if (typeof cat === 'string') return cat;
  return cat.name || cat.country || '';
}

function getFormat(type: any): string {
  if (!type) return '';
  if (typeof type === 'string') return type.toUpperCase();
  if (typeof type === 'object') return type.name ? String(type.name).toUpperCase() : '';
  return String(type).toUpperCase();
}

function getSeasonYear(cs: any): number | null {
  if (!cs) return null;
  if (typeof cs === 'number') return cs;
  if (typeof cs === 'string') {
    const n = parseInt(cs, 10);
    return Number.isNaN(n) ? null : n;
  }
  const raw = cs.year || cs.name;
  if (typeof raw === 'string') {
    const m = raw.match(/(19|20)\d{2}/);
    if (m) return parseInt(m[0], 10);
  }
  return typeof raw === 'number' ? raw : null;
}

function getSeasonDates(cs: any): { start?: string; end?: string } {
  if (!cs) return {};
  if (typeof cs !== 'object') return {};
  return {
    start: cs.start_date || cs.startDate,
    end: cs.end_date || cs.endDate,
  };
}

function formatSeasonLabel(cs: any): string {
  if (!cs) return '';
  if (typeof cs === 'string') return cs;
  return cs.name || (cs.year ? String(cs.year) : '');
}

interface Props {
  initialCountry?: string;
}

export default function TournamentsBoard({ initialCountry }: Props) {
  const [search, setSearch] = useState('');
  const [formatFilter, setFormatFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState(initialCountry || 'all');

  const [displayTournaments, setDisplayTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadTournaments = async () => {
      setLoading(true);
      try {
        const limit = 10;
        const offset = page * limit;
        const data = await fetchTournaments({ limit, offset });
        if (mounted) {
          setDisplayTournaments(data || []);
          setHasMore((data?.length || 0) === limit);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadTournaments();
    return () => { mounted = false; };
  }, [page]);

  useEffect(() => {
    setPage(0);
  }, [search, formatFilter, categoryFilter]);

  const tournaments = displayTournaments;

  const formats = useMemo(() => {
    const map = new Map<string, number>();
    (tournaments || []).forEach((t) => {
      const f = getFormat(t.type) || 'Other';
      map.set(f, (map.get(f) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [tournaments]);

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    (tournaments || []).forEach((t) => {
      const c = getCategoryName(t.category) || 'International';
      map.set(c, (map.get(c) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [tournaments]);

  const filtered = useMemo(() => {
    let list = tournaments || [];
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (t) =>
          (t.name || '').toLowerCase().includes(q) ||
          getCategoryName(t.category).toLowerCase().includes(q) ||
          getFormat(t.type).toLowerCase().includes(q)
      );
    }
    if (formatFilter !== 'all') {
      list = list.filter((t) => getFormat(t.type) === formatFilter);
    }
    if (categoryFilter !== 'all') {
      list = list.filter((t) => getCategoryName(t.category) === categoryFilter);
    }
    return list;
  }, [tournaments, search, formatFilter, categoryFilter]);

  const activeFilters = formatFilter !== 'all' || categoryFilter !== 'all';

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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
              onClick={() => {
                setFormatFilter('all');
                setCategoryFilter('all');
              }}
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
        <div className="lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-stext">
              {filtered.length} tournament{filtered.length === 1 ? '' : 's'}
            </p>
          </div>

          {loading && filtered.length === 0 ? (
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
              <div className="mt-10 flex items-center justify-center gap-6">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0 || loading}
                  className="group flex items-center gap-1.5 rounded-full border border-lborder bg-card px-5 py-2.5 text-sm font-semibold text-text shadow-sm transition-all hover:border-accent/40 hover:bg-elevated hover:text-accent disabled:pointer-events-none disabled:opacity-40"
                >
                  <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
                  Previous
                </button>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-stext">Page</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
                    {page + 1}
                  </span>
                </div>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore || loading}
                  className="group flex items-center gap-1.5 rounded-full border border-lborder bg-card px-5 py-2.5 text-sm font-semibold text-text shadow-sm transition-all hover:border-accent/40 hover:bg-elevated hover:text-accent disabled:pointer-events-none disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={16} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </>
          ) : (
            <EmptyState
              title="No tournaments found"
              message={
                search
                  ? 'No tournaments match your search. Try a different query.'
                  : activeFilters
                    ? 'Nothing in this slot. Try clearing filters.'
                    : 'Tournaments will appear once reference data syncs.'
              }
            />
          )}
        </div>
      </div>

    </>
  );
}

function TournamentCard({ tournament }: { tournament: any }) {
  const category = getCategoryName(tournament.category) || 'International';
  const season = formatSeasonLabel(tournament.currentSeason);
  const format = getFormat(tournament.type);
  const gender = tournament.gender || '';
  const { start, end } = getSeasonDates(tournament.currentSeason);
  const seasonYear = getSeasonYear(tournament.currentSeason);

  const dateRange = start && end ? `${start} → ${end}` : start || end || '';

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