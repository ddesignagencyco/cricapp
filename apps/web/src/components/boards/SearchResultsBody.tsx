'use client';

import Link from 'next/link';
import { Calendar, Loader2, Search, Shield, Trophy, UserRound } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { searchAll } from '../../services/search';
import type { Match, SearchResults } from '../../types/index';
import EmptyState from '../EmptyState';
import TeamLogo from '../TeamLogo';

function initials(name?: string | null): string {
  if (!name || typeof name !== 'string') return '??';
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || '??';
}

function nameHash(name: string): number {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h % 360);
}

function strVal(v: unknown): string {
  if (typeof v === 'string') return v;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return (typeof o.name === 'string' ? o.name : typeof o.title === 'string' ? o.title : '') || '';
  }
  return '';
}

function matchTitle(match: Match): string {
  const home = match.teams?.home?.name || (match.teamNames && match.teamNames[0]) || 'Match';
  const away = match.teams?.away?.name || (match.teamNames && match.teamNames[1]) || '';
  if (away) return `${home} vs ${away}`;
  return home || match.tournament || 'Match';
}

function matchSubtitle(match: Match): string {
  const tour = strVal(match.tournamentName || match.tournament);
  const venue = strVal(match.venue || match.city);
  return [tour, match.status, venue].filter(Boolean).join(' · ');
}

function tournamentSubtitle(item: any): string {
  const category = strVal(item.category);
  const gender = strVal(item.gender);
  const type = strVal(item.type);
  return [category, gender, type].filter(Boolean).join(' · ');
}

export default function SearchResultsBody() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialQ = searchParams.get('q') || '';

  const [inputVal, setInputVal] = useState(initialQ);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQ);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(Boolean(initialQ.trim()));

  // Sync URL query if navigation happens externally
  useEffect(() => {
    setInputVal(initialQ);
    setDebouncedQuery(initialQ);
  }, [initialQ]);

  // Debounce input changes by 300ms
  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(inputVal.trim());
      // Update URL query string without reloading page
      const params = new URLSearchParams(searchParams.toString());
      if (inputVal.trim()) {
        params.set('q', inputVal.trim());
      } else {
        params.delete('q');
      }
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [inputVal, pathname, router, searchParams]);

  // Search when debounced query changes
  useEffect(() => {
    if (!debouncedQuery) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    searchAll(debouncedQuery)
      .then(setResults)
      .catch(() => {
        setResults(null);
        toast.error('Search is temporarily unavailable.');
      })
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  const total = results ? results.players.length + results.teams.length + results.matches.length + results.tournaments.length : 0;

  return (
    <div className="w-full">
      <header className="mb-8 border-b border-lborder pb-6">
        <div className="flex items-center gap-2 text-accent">
          <Search size={17} />
          <span className="text-xs font-bold uppercase tracking-widest text-stext">Search Archive</span>
        </div>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-mtext sm:text-4xl">
          {debouncedQuery ? <>Results for “{debouncedQuery}”</> : 'Search PakCricZone'}
        </h1>
        {debouncedQuery && results && (
          <p className="mt-2 text-sm text-stext">
            {total} result{total === 1 ? '' : 's'} found
          </p>
        )}

        {/* Live debounced search input directly on /search page */}
        <div className="mt-6 max-w-2xl">
          <div className="flex items-center gap-3 rounded-2xl border border-lborder bg-card px-4 py-3 shadow-sm ring-1 ring-black/5 focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/20 transition-all">
            <Search size={18} className="shrink-0 text-accent" />
            <input
              type="search"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Search players, teams, matches or tournaments…"
              className="w-full bg-transparent text-sm sm:text-base text-mtext placeholder:text-stext/70 outline-none"
            />
            {inputVal && (
              <button
                type="button"
                onClick={() => setInputVal('')}
                className="rounded-lg p-1 text-stext hover:bg-elevated hover:text-mtext text-xs font-semibold"
                aria-label="Clear search"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </header>

      {loading && <div className="flex justify-center py-20"><Loader2 size={26} className="animate-spin text-accent" /></div>}
      {!loading && !debouncedQuery && <EmptyState title="Start searching" icon={Search} message="Search players, teams, matches and tournaments." />}
      {!loading && debouncedQuery && results && total === 0 && <EmptyState title="No results found" icon={Search} message={`We couldn't find anything matching “${debouncedQuery}”.`} />}
      {!loading && results && total > 0 && (
        <div className="space-y-8">
          <SearchSection title="Players" icon={<UserRound size={16} />} items={results.players} render={(item) => <SearchCard key={item.id} href={`/players/${item.id}`} title={item.name} subtitle={[item.teamName, item.role].filter(Boolean).join(' · ')} icon={<span className="grid h-9 w-9 place-items-center rounded-full text-[10px] font-bold text-white" style={{ backgroundImage: `linear-gradient(135deg, hsl(${nameHash(item.name)}, 75%, 50%), hsl(${(nameHash(item.name) + 40) % 360}, 85%, 35%))` }}>{initials(item.name)}</span>} />} />
          <SearchSection title="Teams" icon={<Shield size={16} />} items={results.teams} render={(item) => <SearchCard key={item.id} href={`/teams/${item.id}`} title={item.name} subtitle={[item.code || item.shortName, item.country || item.city].filter(Boolean).join(' · ')} icon={<TeamLogo teamId={item.id} name={item.name} code={item.code || item.shortName} size="sm" link={false} />} />} />
          <SearchSection title="Matches" icon={<Calendar size={16} />} items={results.matches} render={(item) => <SearchCard key={item.matchId || item.id} href={`/matches/${item.matchId || item.id}`} title={matchTitle(item)} subtitle={matchSubtitle(item)} icon={<Calendar size={18} />} />} />
          <SearchSection title="Tournaments" icon={<Trophy size={16} />} items={results.tournaments} render={(item) => <SearchCard key={item.id} href={`/tournaments/${item.id}`} title={item.name} subtitle={tournamentSubtitle(item)} icon={<Trophy size={18} />} />} />
        </div>
      )}
    </div>
  );
}

function SearchSection<T>({ title, icon, items, render }: { title: string; icon: ReactNode; items: T[]; render: (_item: T) => ReactNode }) {
  if (!items.length) return null;
  return <section><h2 className="mb-3 flex items-center gap-2 text-base font-bold text-mtext">{icon}{title}<span className="rounded bg-elevated px-2 py-0.5 text-xs font-semibold text-stext">{items.length}</span></h2><div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">{items.map(render)}</div></section>;
}

function SearchCard({ href, title, subtitle, icon }: { href: string; title: string; subtitle: string; icon: ReactNode }) {
  return <Link href={href} className="group flex items-center gap-3 rounded bg-card px-3.5 py-3 ring-1 ring-lborder transition hover:-translate-y-0.5 hover:bg-elevated hover:ring-accent/30"> <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-elevated text-accent">{icon}</span><span className="min-w-0"><span className="block truncate text-sm font-semibold text-mtext group-hover:text-accent">{title}</span><span className="block truncate text-xs text-stext">{subtitle || 'PakCricZone'}</span></span></Link>;
}
