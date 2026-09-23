'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Calendar, Shield, Trophy, UserRound, X } from 'lucide-react';
import SearchField from './SearchField';
import toast from 'react-hot-toast';
import { searchAll } from '../services/search';
import type { Match, SearchResults, TournamentApi } from '../types/index';
import { PlayerSearchAvatar, TeamSearchAvatar, TypeSearchAvatar } from './SearchAvatars';
import { Skeleton } from './skeletons/Skeletons';
import useFocusTrap from '../hooks/useFocusTrap';

interface SearchBarProps {
  autoFocus?: boolean;
  onDone?: () => void;
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

function tournamentSubtitle(item: TournamentApi): string {
  return [strVal(item.category), strVal(item.gender), strVal(item.type)].filter(Boolean).join(' · ');
}

export default function SearchBar({ autoFocus = false, onDone }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useFocusTrap<HTMLDivElement>(true);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const value = query.trim();
    if (!value) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = window.setTimeout(() => {
      searchAll(value)
        .then(setResults)
        .catch(() => {
          setResults(null);
          toast.error('Search is temporarily unavailable.');
        })
        .finally(() => setLoading(false));
    }, 280);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDone?.();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onDone]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const go = (path: string) => {
    onDone?.();
    router.push(path);
  };

  const total = results
    ? results.players.length + results.teams.length + results.matches.length + results.tournaments.length
    : 0;

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="scrim fixed inset-0 z-[100] flex items-start justify-center px-4 pt-16 sm:pt-20"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onDone?.();
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="global-search-title"
        className="elev-overlay w-full max-w-xl overflow-hidden rounded-md border border-lborder bg-card"
      >
        <div className="flex items-center gap-3 border-b border-lborder px-4 py-3">
          <div className="min-w-0 flex-1">
            <label id="global-search-title" htmlFor="global-search-input" className="sr-only">
              Search PakCricZone
            </label>
            <SearchField
              ref={inputRef}
              id="global-search-input"
              iconClassName="text-accent"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && query.trim()) go(`/search?q=${encodeURIComponent(query.trim())}`);
              }}
              placeholder="Search players, teams, matches or tournaments"
              autoFocus={autoFocus}
              inputClassName="sm:text-base"
            />
          </div>
          <kbd className="hidden rounded border border-lborder px-1.5 py-0.5 text-[10px] font-semibold text-stext sm:block">
            ESC
          </kbd>
          <button
            type="button"
            onClick={() => onDone?.()}
            className="rounded p-1.5 text-stext transition-colors duration-150 hover:bg-[var(--color-row-hover)] hover:text-mtext"
            aria-label="Close search"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div className="max-h-[min(60vh,520px)] overflow-y-auto p-2 sm:p-3">
          {!query.trim() && (
            <p className="px-3 py-10 text-center text-sm font-medium text-stext">Search across the PakCricZone archive.</p>
          )}
          {loading && (
            <div className="space-y-2 p-2">
              <Skeleton height={56} />
              <Skeleton height={56} />
              <Skeleton height={56} />
            </div>
          )}
          {!loading && results && total === 0 && (
            <p className="px-3 py-10 text-center text-sm text-stext">No results found for “{query.trim()}”.</p>
          )}
          {!loading && results && total > 0 && (
            <div className="space-y-4">
              <ResultGroup
                title="Players"
                icon={<UserRound size={14} />}
                count={results.players.length}
                items={results.players}
                itemKey={(item, index) => String(item.id || `player-${index}`)}
                render={(item) => {
                  const playerName = item.name || item.fullName || item.shortName || 'Player';
                  return (
                    <ResultButton
                      title={playerName}
                      subtitle={[item.teamName, item.role].filter(Boolean).join(' · ')}
                      avatar={<PlayerSearchAvatar name={playerName} />}
                      onClick={() => go(`/players/${item.id}`)}
                    />
                  );
                }}
              />
              <ResultGroup
                title="Teams"
                icon={<Shield size={14} />}
                count={results.teams.length}
                items={results.teams}
                itemKey={(item, index) => String(item.id || `team-${index}`)}
                render={(item) => (
                  <ResultButton
                    title={item.name}
                    subtitle={[item.code || item.shortName, item.country || item.city].filter(Boolean).join(' · ')}
                    avatar={<TeamSearchAvatar id={item.id} name={item.name} code={item.code || item.shortName} />}
                    onClick={() => go(`/teams/${item.id}`)}
                  />
                )}
              />
              <ResultGroup
                title="Matches"
                icon={<Calendar size={14} />}
                count={results.matches.length}
                items={results.matches}
                itemKey={(item, index) => String(item.matchId || item.id || `match-${index}`)}
                render={(item) => (
                  <ResultButton
                    title={matchTitle(item)}
                    subtitle={matchSubtitle(item)}
                    avatar={<TypeSearchAvatar type="match" />}
                    onClick={() => go(`/matches/${item.matchId || item.id}`)}
                  />
                )}
              />
              <ResultGroup
                title="Tournaments"
                icon={<Trophy size={14} />}
                count={results.tournaments.length}
                items={results.tournaments}
                itemKey={(item, index) => String(item.id || `tournament-${index}`)}
                render={(item) => (
                  <ResultButton
                    title={item.name}
                    subtitle={tournamentSubtitle(item)}
                    avatar={<TypeSearchAvatar type="tournament" />}
                    onClick={() => go(`/tournaments/${item.id}`)}
                  />
                )}
              />
              <button
                type="button"
                onClick={() => go(`/search?q=${encodeURIComponent(query.trim())}`)}
                className="w-full border-t border-lborder pt-3 text-center text-xs font-semibold text-accent"
              >
                View all {total} results
              </button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ResultGroup<T>({
  title,
  icon,
  count,
  items,
  itemKey,
  render,
}: {
  title: string;
  icon: ReactNode;
  count: number;
  items: T[];
  itemKey: (_item: T, _index: number) => string;
  render: (_item: T) => ReactNode;
}) {
  if (!items.length) return null;
  return (
    <section>
      <h2 className="mb-1.5 flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-stext">
        {icon}
        {title}
        <span className="rounded bg-elevated px-1.5 py-0.5 text-[10px] font-semibold">{count}</span>
      </h2>
      <div className="space-y-0.5">
        {items.map((item, index) => (
          <div key={itemKey(item, index)}>{render(item)}</div>
        ))}
      </div>
    </section>
  );
}

function ResultButton({
  title,
  subtitle,
  avatar,
  onClick,
}: {
  title: string;
  subtitle: string;
  avatar: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-[var(--color-row-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
    >
      {avatar}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-mtext">{title}</span>
        <span className="block truncate text-xs text-stext">{subtitle || 'PakCricZone'}</span>
      </span>
    </button>
  );
}
