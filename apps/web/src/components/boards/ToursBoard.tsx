'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, MapPin, Search, Trophy, X } from 'lucide-react';
import EmptyState from '../EmptyState';

function getCountryName(cat: any): string {
  if (!cat) return '';
  if (typeof cat === 'string') return cat;
  return cat.name || cat.country || cat.id || '';
}

function getSportName(sport: any): string {
  if (!sport) return '';
  if (typeof sport === 'string') return sport;
  return sport.name || sport.id || '';
}

function getCountryCode(cat: any): string {
  if (!cat) return '';
  if (typeof cat === 'string') return cat;
  return cat.country_code || '';
}

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
      const c = getCountryName(t.category) || 'International';
      map.set(c, (map.get(c) || 0) + 1);
    });
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [tours]);

  const sports = useMemo(() => {
    const map = new Map<string, number>();
    (tours || []).forEach((t) => {
      const s = getSportName(t.sport) || 'Cricket';
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
          getCountryName(t.category).toLowerCase().includes(q) ||
          getSportName(t.sport).toLowerCase().includes(q)
      );
    }
    if (countryFilter !== 'all') {
      list = list.filter((t) => getCountryName(t.category) === countryFilter);
    }
    if (sportFilter !== 'all') {
      list = list.filter((t) => getSportName(t.sport) === sportFilter);
    }
    return list;
  }, [tours, search, countryFilter, sportFilter]);

  const activeFilters = countryFilter !== 'all' || sportFilter !== 'all';

  return (
    <>
      <header className="mb-6">
        <div className="flex items-center gap-2 text-accent">
          <Trophy size={18} />
          <span className="text-xs font-bold uppercase tracking-widest text-stext">
            Cricket Tours by Country
          </span>
        </div>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Tours</h1>
        <p className="mt-2 text-sm text-stext">
          Browse international and domestic cricket tours by country and category.
        </p>
      </header>

      <div className="mb-6 max-w-xl">
        <div className="flex items-center gap-2 rounded-xl bg-card px-3.5 py-3 ring-1 ring-lborder focus-within:ring-accent/50">
          <Search size={17} className="shrink-0 text-stext" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tours by name or country..."
            className="w-full bg-transparent text-sm text-mtext placeholder:text-stext focus:outline-none"
          />
        </div>
      </div>

      <div className="mb-8 rounded-2xl bg-card p-4 ring-1 ring-lborder">
        <div className="mb-3 flex items-center gap-2">
          <MapPin size={14} className="text-accent" />
          <span className="text-xs font-bold uppercase tracking-widest text-stext">Browse by Country</span>
          {activeFilters && (
            <button
              type="button"
              onClick={() => {
                setCountryFilter('all');
                setSportFilter('all');
              }}
              className="ml-auto flex items-center gap-1 text-[11px] font-bold text-accent hover:underline"
            >
              <X size={12} /> Clear all
            </button>
          )}
        </div>

        {categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCountryFilter('all')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${countryFilter === 'all'
                ? 'bg-accent/15 text-accent ring-1 ring-inset ring-accent/25'
                : 'bg-elevated text-stext ring-1 ring-lborder hover:text-mtext'
                }`}
            >
              <MapPin size={11} className="text-accent" />
              All Countries
            </button>
            {categories.slice(0, 12).map(([cat, count]) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCountryFilter(countryFilter === cat ? 'all' : cat)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${countryFilter === cat
                  ? 'bg-accent/15 text-accent ring-1 ring-inset ring-accent/25'
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

        {sports.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <Activity size={13} className="text-stext/70" />
            {sports.map(([sport]) => (
              <button
                key={sport}
                type="button"
                onClick={() => setSportFilter(sportFilter === sport ? 'all' : sport)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${sportFilter === sport
                  ? 'bg-accent2/15 text-accent2 ring-1 ring-inset ring-accent2/25'
                  : 'bg-elevated text-stext ring-1 ring-lborder hover:text-mtext'
                  }`}
              >
                {sport}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length > 0 ? (
        <>
          <p className="mb-4 text-xs text-stext">
            Showing {filtered.length} tour{filtered.length === 1 ? '' : 's'}
          </p>
          <div className="fade-in grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          title="No tours found"
          message={search ? 'No tours match your search. Try a different query.' : 'Tours will appear once reference data syncs.'}
        />
      )}
    </>
  );
}

function TourCard({ tour }: { tour: any }) {
  const country = getCountryName(tour.category) || 'International';
  const sport = getSportName(tour.sport) || 'Cricket';
  const code = getCountryCode(tour.category);
  const countryParam = encodeURIComponent(country);

  return (
    <div className="group rounded-2xl bg-card p-5 ring-1 ring-lborder transition-all duration-300 hover:-translate-y-0.5 hover:bg-elevated hover:ring-accent/30">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {code && <p className="text-[10px] font-bold uppercase tracking-widest text-stext/70">{code}</p>}
          <h3 className="line-clamp-2 text-base font-bold text-mtext group-hover:text-accent">
            {tour.name}
          </h3>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs text-stext">
        <span className="inline-flex items-center gap-1 rounded-full bg-elevated px-2 py-0.5 ring-1 ring-lborder">
          <MapPin size={11} className="text-accent" />
          {country}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-elevated px-2 py-0.5 ring-1 ring-lborder">
          {sport}
        </span>
      </div>
      <Link
        href={`/tournaments?country=${countryParam}`}
        className="mt-3 inline-flex items-center gap-1 text-[11px] font-bold text-accent hover:underline"
      >
        View {country} tournaments →
      </Link>
    </div>
  );
}