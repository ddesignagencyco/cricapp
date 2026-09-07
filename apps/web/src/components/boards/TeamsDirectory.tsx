'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search, Users } from 'lucide-react';
import TeamCard from '../TeamCard';
import EmptyState from '../EmptyState';
import { fetchTeams } from '../../services/teams';

export default function TeamsDirectory() {
  const [search, setSearch] = useState('');

  const [displayTeams, setDisplayTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    let mounted = true;
    const loadTeams = async () => {
      setLoading(true);
      try {
        const limit = 12;
        const offset = page * limit;
        const data = await fetchTeams({ limit, offset });
        if (mounted) {
          setDisplayTeams(data || []);
          setHasMore((data?.length || 0) === limit);
        }
      } catch (err) {
        console.error(err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    loadTeams();
    return () => { mounted = false; };
  }, [page]);

  useEffect(() => {
    setPage(0);
  }, [search]);

  const filtered = useMemo(() => {
    let list = displayTeams || [];
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
  }, [displayTeams, search]);

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

      {loading && filtered.length === 0 ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-accent" size={32} />
        </div>
      ) : filtered.length > 0 ? (
        <>
          <p className="mb-4 text-xs text-stext">
            Showing {filtered.length} team{filtered.length === 1 ? '' : 's'}
          </p>
          <div className="fade-in grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((t) => (
              <TeamCard key={t.id} team={t} />
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
          title="No teams found"
          message="No teams match your search. Try a different query."
        />
      )}
    </>
  );
}