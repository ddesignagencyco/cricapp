'use client';

import { useMemo, useState } from 'react';
import { Search, Users } from 'lucide-react';
import TeamCard from '../TeamCard';
import EmptyState from '../EmptyState';

interface Props {
  teams: any[];
}

export default function TeamsDirectory({ teams }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let list = teams || [];
    const q = search.toLowerCase().trim();
    if (q) {
      list = list.filter(
        (t) =>
          (t.name || '').toLowerCase().includes(q) ||
          (t.abbr || t.code || '').toLowerCase().includes(q) ||
          (t.country || '').toLowerCase().includes(q) ||
          (t.city || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [teams, search]);

  return (
    <>
      <header className="mb-8">
        <div className="flex items-center gap-2 text-accent">
          <Users size={18} />
          <span className="text-xs font-bold uppercase tracking-widest text-stext">
            All Teams
          </span>
        </div>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Teams</h1>
        <p className="mt-2 text-sm text-stext">
          Browse every cricket team and their squads.
        </p>
      </header>

      <div className="mb-6 max-w-xl">
        <div className="flex items-center gap-2 rounded-xl bg-card px-3.5 py-3 ring-1 ring-lborder focus-within:ring-accent/50">
          <Search size={17} className="shrink-0 text-stext" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teams by name, code or country…"
            className="w-full bg-transparent text-sm text-mtext placeholder:text-stext focus:outline-none"
          />
        </div>
      </div>

      {filtered.length > 0 ? (
        <>
          <p className="mb-4 text-xs text-stext">
            Showing {filtered.length} team{filtered.length === 1 ? '' : 's'}
          </p>
          <div className="fade-in grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => (
              <TeamCard key={t.id} team={t} />
            ))}
          </div>
        </>
      ) : (
        <EmptyState
          title="No teams found"
          message="No teams match your search. Try a different query."
        />
      )}
    </>
  );
}
