'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Users, Shield, Calendar, Trophy, X } from 'lucide-react';
import { searchAll } from '../services/search';
import TeamLogo from './TeamLogo';

interface SearchBarProps {
  autoFocus?: boolean;
  onDone?: () => void;
}

const ResultIcon = ({ type }: { type: string }) => {
  const cls = 'text-stext';
  if (type === 'players') return <Users size={16} className={cls} />;
  if (type === 'teams') return <Shield size={16} className={cls} />;
  if (type === 'matches') return <Calendar size={16} className={cls} />;
  return <Trophy size={16} className={cls} />;
};

export default function SearchBar({ autoFocus = false, onDone }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);
  const [open, setOpen] = useState(autoFocus);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!query.trim()) {
      setResults(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      const res = await searchAll(query);
      setResults(res);
      setLoading(false);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const close = (path?: string) => {
    setOpen(false);
    setQuery('');
    setResults(null);
    onDone?.();
    if (path) router.push(path);
  };

  const groups = results
    ? [
        { key: 'players', label: 'Players', items: results.players, to: (r: any) => `/players/${r.id}` },
        { key: 'teams', label: 'Teams', items: results.teams, to: (r: any) => `/teams/${r.id}` },
        { key: 'matches', label: 'Matches', items: results.matches, to: (r: any) => `/matches/${r.id}` },
        { key: 'tournaments', label: 'Tournaments', items: results.tournaments, to: () => '/psl' },
      ].filter((g) => g.items.length > 0)
    : [];

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="flex items-center gap-2 rounded-xl bg-card px-3.5 py-2.5 ring-1 ring-lborder focus-within:ring-accent/50">
        <Search size={17} className="shrink-0 text-stext" />
        <input
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search players, teams, matches\u2026"
          className="w-full bg-transparent text-sm text-mtext placeholder:text-stext focus:outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && query.trim()) {
              close(`/search?q=${encodeURIComponent(query.trim())}`);
            }
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setResults(null);
            }}
            className="text-stext transition-colors hover:text-mtext"
            aria-label="Clear search"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl bg-elevated p-3 shadow-2xl shadow-shadow/40 ring-1 ring-lborder">
          {!query && (
            <p className="px-2 py-6 text-center text-sm text-stext">
              Type to search players, teams, matches and tournaments
            </p>
          )}
          {loading && (
            <div className="space-y-2 p-2">
              <div className="skeleton h-10 rounded-lg" />
              <div className="skeleton h-10 rounded-lg" />
              <div className="skeleton h-10 rounded-lg" />
            </div>
          )}
          {!loading && results && groups.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-stext">
              No results for &ldquo;{query}&rdquo;
            </p>
          )}
          {groups.map((group) => (
            <div key={group.key} className="mb-2 last:mb-0">
              <p className="mb-1 px-2 text-[11px] font-bold uppercase tracking-widest text-stext">
                {group.label}
              </p>
              {group.items.map((item: any) => (
                <button
                  key={`${group.key}-${item.id}`}
                  type="button"
                  onClick={() => close(group.to(item))}
                  className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-card"
                >
                  {group.key === 'teams' ? (
                    <TeamLogo teamId={item.id} size="xs" />
                  ) : group.key === 'players' ? (
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-xs font-bold text-accent ring-1 ring-lborder">
                      {item.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('')}
                    </span>
                  ) : (
                    <ResultIcon type={group.key} />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-mtext">
                      {group.key === 'matches'
                        ? item.label
                        : item.name}
                    </span>
                    <span className="block truncate text-xs text-stext">
                      {group.key === 'players'
                        ? `${item.teamName} \u2022 ${item.role}`
                        : group.key === 'teams'
                          ? `${item.shortName} \u2022 ${item.city}`
                          : group.key === 'matches'
                            ? `${item.tournament} \u2022 ${item.status}`
                            : `${item.shortName} \u2022 ${item.format}`}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          ))}
          {results && groups.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => close(`/search?q=${encodeURIComponent(query.trim())}`)}
                className="block w-full border-t border-lborder px-2 pt-2 pb-1 text-center text-xs font-semibold text-accent hover:text-accent2"
              >
                View all results for &ldquo;{query}&rdquo;
              </button>
              <p className="px-2 pt-1 text-center text-[11px] text-stext">
                Press Esc to close
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
