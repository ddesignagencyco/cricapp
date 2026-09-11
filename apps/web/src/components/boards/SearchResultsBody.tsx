'use client';

import Link from 'next/link';
import { ArrowRight, Calendar, Loader2, Search, Shield, Trophy, UserRound, X } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { searchAll } from '../../services/search';
import type { Match, SearchResults } from '../../types/index';
import EmptyState from '../EmptyState';
import { PlayerSearchAvatar, TeamSearchAvatar, TypeSearchAvatar } from '../SearchAvatars';

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

function tournamentSubtitle(item: { category?: unknown; gender?: unknown; type?: unknown }): string {
  return [strVal(item.category), strVal(item.gender), strVal(item.type)].filter(Boolean).join(' · ');
}

type Filter = 'all' | 'players' | 'teams' | 'matches' | 'tournaments';

export default function SearchResultsBody() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialQ = searchParams.get('q') || '';

  const [inputVal, setInputVal] = useState(initialQ);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQ);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(Boolean(initialQ.trim()));
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    setInputVal(initialQ);
    setDebouncedQuery(initialQ);
  }, [initialQ]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(inputVal.trim());
      const params = new URLSearchParams(searchParams.toString());
      if (inputVal.trim()) params.set('q', inputVal.trim());
      else params.delete('q');
      const qs = params.toString();
      router.replace(`${pathname}${qs ? `?${qs}` : ''}`, { scroll: false });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [inputVal, pathname, router, searchParams]);

  useEffect(() => {
    if (!debouncedQuery) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    searchAll(debouncedQuery)
      .then((data) => {
        setResults(data);
        setFilter('all');
      })
      .catch(() => {
        setResults(null);
        toast.error('Search is temporarily unavailable.');
      })
      .finally(() => setLoading(false));
  }, [debouncedQuery]);

  const counts = useMemo(() => {
    if (!results) return { players: 0, teams: 0, matches: 0, tournaments: 0, total: 0 };
    const players = results.players.length;
    const teams = results.teams.length;
    const matches = results.matches.length;
    const tournaments = results.tournaments.length;
    return { players, teams, matches, tournaments, total: players + teams + matches + tournaments };
  }, [results]);

  const show = (key: Filter) => filter === 'all' || filter === key;

  return (
    <div className="w-full">
      <header className="mb-8 rounded-md border border-lborder bg-card p-5 sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">Search archive</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-mtext sm:text-3xl">
          {debouncedQuery ? `Results for “${debouncedQuery}”` : 'Search PakCricZone'}
        </h1>
        <p className="mt-1 text-sm text-stext">
          {debouncedQuery && results
            ? `${counts.total} result${counts.total === 1 ? '' : 's'} found`
            : 'Find players, teams, matches and tournaments.'}
        </p>

        <div className="relative mt-5 max-w-2xl">
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-accent" />
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Search players, teams, matches or tournaments…"
            autoComplete="off"
            className="w-full rounded-md border border-lborder bg-elevated py-3 pl-10 pr-20 text-sm text-mtext outline-none placeholder:text-stext/70 focus:border-accent focus:ring-2 focus:ring-accent/20"
          />
          {inputVal ? (
            <button
              type="button"
              onClick={() => setInputVal('')}
              className="absolute right-2 top-1/2 inline-flex -translate-y-1/2 items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-stext hover:bg-card hover:text-mtext"
              aria-label="Clear search"
            >
              <X size={12} />
              Clear
            </button>
          ) : null}
        </div>
      </header>

      {loading && (
        <div className="flex justify-center py-20">
          <Loader2 size={26} className="animate-spin text-accent" />
        </div>
      )}
      {!loading && !debouncedQuery && (
        <EmptyState title="Start searching" icon={Search} message="Search players, teams, matches and tournaments." />
      )}
      {!loading && debouncedQuery && results && counts.total === 0 && (
        <EmptyState title="No results found" icon={Search} message={`We couldn't find anything matching “${debouncedQuery}”.`} />
      )}
      {!loading && results && counts.total > 0 && (
        <>
          <div className="mb-6 flex flex-wrap gap-2">
            <FilterChip label="All" count={counts.total} active={filter === 'all'} onClick={() => setFilter('all')} />
            <FilterChip label="Players" count={counts.players} active={filter === 'players'} onClick={() => setFilter('players')} />
            <FilterChip label="Teams" count={counts.teams} active={filter === 'teams'} onClick={() => setFilter('teams')} />
            <FilterChip label="Matches" count={counts.matches} active={filter === 'matches'} onClick={() => setFilter('matches')} />
            <FilterChip label="Tournaments" count={counts.tournaments} active={filter === 'tournaments'} onClick={() => setFilter('tournaments')} />
          </div>

          <div className="space-y-8">
            {show('players') && (
              <SearchSection title="Players" icon={<UserRound size={16} />} count={counts.players}>
                {results.players.map((item) => (
                  <SearchCard
                    key={item.id}
                    href={`/players/${item.id}`}
                    title={item.name || item.fullName || 'Player'}
                    subtitle={[item.teamName, item.role].filter(Boolean).join(' · ')}
                    avatar={<PlayerSearchAvatar name={item.name || item.fullName || 'Player'} />}
                  />
                ))}
              </SearchSection>
            )}
            {show('teams') && (
              <SearchSection title="Teams" icon={<Shield size={16} />} count={counts.teams}>
                {results.teams.map((item) => (
                  <SearchCard
                    key={item.id}
                    href={`/teams/${item.id}`}
                    title={item.name}
                    subtitle={[item.code || item.shortName, item.country || item.city].filter(Boolean).join(' · ')}
                    avatar={<TeamSearchAvatar id={item.id} name={item.name} code={item.code || item.shortName} />}
                  />
                ))}
              </SearchSection>
            )}
            {show('matches') && (
              <SearchSection title="Matches" icon={<Calendar size={16} />} count={counts.matches}>
                {results.matches.map((item) => (
                  <SearchCard
                    key={item.matchId || item.id}
                    href={`/matches/${item.matchId || item.id}`}
                    title={matchTitle(item)}
                    subtitle={matchSubtitle(item)}
                    avatar={<TypeSearchAvatar type="match" />}
                  />
                ))}
              </SearchSection>
            )}
            {show('tournaments') && (
              <SearchSection title="Tournaments" icon={<Trophy size={16} />} count={counts.tournaments}>
                {results.tournaments.map((item) => (
                  <SearchCard
                    key={item.id}
                    href={`/tournaments/${item.id}`}
                    title={item.name}
                    subtitle={tournamentSubtitle(item)}
                    avatar={<TypeSearchAvatar type="tournament" />}
                  />
                ))}
              </SearchSection>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function FilterChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  if (label !== 'All' && count === 0) return null;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? 'btn-brand' : 'border border-lborder bg-card text-stext hover:bg-elevated hover:text-mtext'
      }`}
    >
      {label}
      <span
        className={`rounded px-1.5 py-0.5 text-[11px] font-bold ${
          active ? 'bg-black/25 text-white' : 'bg-elevated text-stext'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function SearchSection({
  title,
  icon,
  count,
  children,
}: {
  title: string;
  icon: ReactNode;
  count: number;
  children: ReactNode;
}) {
  if (count === 0) return null;
  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-mtext">
        {icon}
        {title}
        <span className="rounded bg-elevated px-2 py-0.5 text-xs font-semibold text-stext">{count}</span>
      </h2>
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function SearchCard({
  href,
  title,
  subtitle,
  avatar,
}: {
  href: string;
  title: string;
  subtitle: string;
  avatar: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-md border border-lborder bg-card px-3.5 py-3 transition-colors hover:border-accent/40 hover:bg-elevated"
    >
      {avatar}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-mtext group-hover:text-accent">{title}</span>
        <span className="block truncate text-xs text-stext">{subtitle || 'PakCricZone'}</span>
      </span>
      <ArrowRight size={14} className="shrink-0 text-stext opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}
