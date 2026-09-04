'use client';

import { useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import PlayerCard from '../PlayerCard';
import EmptyState from '../EmptyState';

interface Props {
  players: any[];
}

export default function PlayerDirectory({ players }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = players || [];
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (p) =>
          (p.fullName || p.name || '').toLowerCase().includes(q) ||
          (p.team?.name || p.teamName || '').toLowerCase().includes(q) ||
          (p.nationality || p.country || '').toLowerCase().includes(q) ||
          (p.role || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [players, search]);

  return (
    <>
      <header className="mb-8">
        <div className="flex items-center gap-2 text-accent">
          <Users size={18} />
          <span className="text-xs font-bold uppercase tracking-widest text-stext">
            Player Directory
          </span>
        </div>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Players</h1>
        <p className="mt-2 text-sm text-stext">
          Search and explore players — batters, bowlers and all-rounders from every squad.
        </p>
      </header>

      <div className="mb-6 max-w-xl">
        <div className="flex items-center gap-2 rounded-xl bg-card px-3.5 py-3 ring-1 ring-lborder focus-within:ring-accent/50">
          <Search size={17} className="shrink-0 text-stext" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search players by name, team, country or role…"
            className="w-full bg-transparent text-sm text-mtext placeholder:text-stext focus:outline-none"
          />
        </div>
      </div>

      {filtered.length > 0 ? (
        <>
          <p className="mb-4 text-xs text-stext">
            Showing {filtered.length} player{filtered.length === 1 ? '' : 's'}
          </p>
          <div className="fade-in grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((p) => (
              <PlayerCard key={p.id} player={p} />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          title="No players found"
          message="No players match your search. Try a different query."
        />
      )}
    </>
  );
}
