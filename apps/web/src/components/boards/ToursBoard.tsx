'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, MapPin, Search, Trophy, X } from 'lucide-react';
import { str } from '../../utils/extract';
import EmptyState from '../EmptyState';

interface Props {
  tours: any[];
}

const chipClass = (active: boolean) =>
  `flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors ${
    active
      ? 'btn-brand'
      : 'border border-lborder bg-card text-stext hover:bg-secondary hover:text-mtext'
  }`;

export default function ToursBoard({ tours }: Props) {
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');

  const categories = useMemo(() => {
    const map = new Map<string, number>();
    (tours || []).forEach((t) => {
      const c = str(t.category) || 'International';
      map.set(c, (map.get(c) || 0) + 1);
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
    return list;
  }, [tours, search, countryFilter]);

  const activeFilters = countryFilter !== 'all';

  return (
    <div className="space-y-5">
      <header className="rounded-md border border-lborder bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-accent">
              <Trophy size={13} />
              International & bilateral series
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-mtext">Cricket Tours & Series</h1>
            <p className="mt-1 text-sm leading-relaxed text-stext">
              Ongoing and scheduled bilateral tours, Test matches, ODI series and domestic championship visits.
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-md border border-lborder bg-secondary px-4 py-3">
            <div className="btn-brand grid h-9 w-9 place-items-center rounded-md">
              <Trophy size={18} />
            </div>
            <div>
              <p className="text-lg font-semibold leading-none text-mtext">{tours.length}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-stext">Tours</p>
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
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tours by series name, country or category…"
              className="w-full rounded-md border border-lborder bg-card py-2.5 pl-10 pr-4 text-sm text-mtext outline-none transition-colors focus:border-accent focus:bg-elevated focus:ring-2 focus:ring-accent/20"
            />
          </div>
          {activeFilters && (
            <button
              type="button"
              onClick={() => setCountryFilter('all')}
              className="inline-flex items-center gap-1.5 rounded border border-lborder bg-card px-3 py-2 text-xs font-medium text-accent transition-colors hover:bg-secondary"
            >
              <X size={13} />
              Clear filters
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => setCountryFilter('all')} className={chipClass(countryFilter === 'all')}>
              All Regions
            </button>
            {categories.slice(0, 14).map(([cat, count]) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCountryFilter(countryFilter === cat ? 'all' : cat)}
                className={chipClass(countryFilter === cat)}
              >
                <span>{cat}</span>
                <span className={countryFilter === cat ? 'text-white/80' : 'text-stext'}>{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-stext">
        Showing <span className="font-semibold text-mtext">{filtered.length}</span> of {tours.length} tour
        {tours.length === 1 ? '' : 's'}
      </p>

      {filtered.length > 0 ? (
        <div className="fade-in grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((tour) => (
            <TourCard key={tour.id} tour={tour} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No cricket tours found"
          message={
            search || activeFilters
              ? 'No tours match your current filters. Try clearing them.'
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
  const code =
    typeof tour.category === 'object' && tour.category?.country_code ? String(tour.category.country_code) : '';
  const countryParam = encodeURIComponent(country);

  return (
    <Link
      href={`/tournaments?country=${countryParam}`}
      className="group flex items-center gap-3 rounded-md border border-lborder bg-card p-3.5 transition-colors hover:border-accent/50 hover:bg-elevated"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md border border-lborder bg-secondary text-accent">
        <Trophy size={18} />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-semibold text-mtext transition-colors group-hover:text-accent" title={tour.name}>
          {tour.name}
        </h3>
        <p className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-stext">
          <span className="inline-flex min-w-0 items-center gap-1 truncate">
            <MapPin size={11} className="shrink-0" />
            <span className="truncate">{country}</span>
          </span>
          {code && <span className="shrink-0 font-mono uppercase">{code}</span>}
          <span className="truncate">{sport}</span>
        </p>
      </div>
      <ChevronRight size={16} className="shrink-0 text-stext transition-colors group-hover:text-accent" aria-hidden="true" />
    </Link>
  );
}
