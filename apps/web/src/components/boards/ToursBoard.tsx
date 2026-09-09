'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, MapPin, Search, Trophy, X } from 'lucide-react';
import { str } from '../../utils/extract';
import EmptyState from '../EmptyState';

interface Props {
  tours: any[];
}

export default function ToursBoard({ tours }: Props) {
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [sportFilter, setSportFilter] = useState('all');

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    (tours || []).forEach((t) => {
      const c = str(t.category) || 'International';
      map.set(c, (map.get(c) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [tours]);

  const sports = useMemo(() => {
    const map = new Map<string, number>();
    (tours || []).forEach((t) => {
      const s = str(t.sport) || 'Cricket';
      map.set(s, (map.get(s) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [tours]);

  const filtered = useMemo(() => {
    let list = tours || [];
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (t) =>
          (t.name || '').toLowerCase().includes(q) ||
          str(t.category).toLowerCase().includes(q) ||
          str(t.sport).toLowerCase().includes(q)
      );
    }
    if (countryFilter !== 'all') {
      list = list.filter((t) => str(t.category) === countryFilter);
    }
    if (sportFilter !== 'all') {
      list = list.filter((t) => str(t.sport) === sportFilter);
    }
    return list;
  }, [tours, search, countryFilter, sportFilter]);

  const activeFilters = countryFilter !== 'all' || sportFilter !== 'all';

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-lborder bg-gradient-to-br from-card via-card to-elevated p-6 shadow-sm sm:p-8">
        <div className="absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/5 blur-3xl pointer-events-none" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-accent border border-accent/20">
              <Trophy size={13} />
              <span>International & Bilateral Series</span>
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-mtext sm:text-4xl">
              Cricket Tours & Series
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-stext sm:text-base">
              Explore ongoing and scheduled global bilateral tours, test matches, ODI series, and domestic championship visits worldwide.
            </p>
          </div>

          {/* Quick Count Badge */}
          <div className="flex items-center gap-3 rounded-2xl border border-lborder/80 bg-secondary/80 px-5 py-3.5 shadow-inner">
            <div className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-white shadow-sm">
              <Trophy size={20} />
            </div>
            <div>
              <div className="text-2xl font-black text-mtext">{tours.length}</div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-stext">
                Active Tours
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Country Filter Box */}
      <div className="space-y-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search
              size={16}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stext"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tours by series name, country, or category…"
              className="w-full rounded-2xl border border-lborder bg-card py-2.5 pl-10 pr-4 text-xs text-mtext outline-none transition focus:border-accent focus:bg-elevated focus:ring-2 focus:ring-accent/20"
            />
          </div>

          {activeFilters && (
            <button
              type="button"
              onClick={() => {
                setCountryFilter('all');
                setSportFilter('all');
              }}
              className="flex items-center gap-1.5 rounded-xl border border-lborder bg-card px-3.5 py-2 text-xs font-bold text-accent transition-colors hover:bg-secondary cursor-pointer"
            >
              <X size={13} />
              <span>Clear filters</span>
            </button>
          )}
        </div>

        {/* Country Filter Chips */}
        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setCountryFilter('all')}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                countryFilter === 'all'
                  ? 'bg-accent text-white shadow-md shadow-accent/20'
                  : 'border border-lborder bg-card text-stext hover:text-mtext hover:bg-secondary'
              }`}
            >
              All Regions
            </button>
            {categories.slice(0, 14).map(([cat, count]) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCountryFilter(countryFilter === cat ? 'all' : cat)}
                className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
                  countryFilter === cat
                    ? 'bg-accent text-white shadow-md shadow-accent/20'
                    : 'border border-lborder bg-card text-stext hover:text-mtext hover:bg-secondary'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`rounded-md px-1.5 py-0.2 text-[10px] font-semibold ${
                    countryFilter === cat ? 'bg-white/20 text-white' : 'bg-secondary text-stext'
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
          Showing <span className="font-bold text-mtext">{filtered.length}</span> of {tours.length} tour{tours.length === 1 ? '' : 's'}
        </p>
      </div>

      {/* Grid Content */}
      {filtered.length > 0 ? (
        <div className="fade-in grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tour) => (
            <TourCard key={tour.id} tour={tour} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No cricket tours found"
          message={
            search || activeFilters
              ? 'No tours match your current filter parameters. Try clearing your filters.'
              : 'Tours reference data will appear once synced.'
          }
        />
      )}
    </div>
  );
}

function TourCard({ tour }: { tour: any }) {
  const country = str(tour.category) || 'International';
  const sport = str(tour.sport) || 'Cricket';
  const code = typeof tour.category === 'object' && tour.category?.country_code ? tour.category.country_code : '';
  const countryParam = encodeURIComponent(country);

  return (
    <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-lborder bg-card p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/50 hover:bg-elevated hover:shadow-xl hover:shadow-accent/10">
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-stext border border-lborder/60">
            <MapPin size={10} className="text-accent" />
            {country}
          </span>
          {code && (
            <span className="font-mono text-xs font-black uppercase tracking-widest text-accent">
              {code}
            </span>
          )}
        </div>

        {/* Tour Title */}
        <div className="mt-4 flex items-start gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-accent/10 text-accent ring-1 ring-accent/20 group-hover:scale-105 transition-transform">
            <Trophy size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="line-clamp-2 text-base font-bold leading-snug text-mtext transition-colors group-hover:text-accent">
              {tour.name}
            </h3>
            <p className="mt-1 text-xs font-medium text-stext">{sport}</p>
          </div>
        </div>
      </div>

      {/* Card Action Footer */}
      <div className="mt-6 flex items-center justify-between border-t border-lborder/60 pt-3 text-xs">
        <span className="text-[11px] font-semibold text-stext">Series Hub</span>
        <Link
          href={`/tournaments?country=${countryParam}`}
          className="inline-flex items-center gap-1 font-bold text-accent transition-transform duration-300 group-hover:translate-x-1 hover:underline"
        >
          <span>Tournaments</span>
          <span>→</span>
        </Link>
      </div>
    </div>
  );
}
