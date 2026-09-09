'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Loader2, Search, Users } from 'lucide-react';
import type { Team } from '../../types/index';
import { fetchTeamsPage } from '../../services/teams';
import TeamCard from '../TeamCard';
import EmptyState from '../EmptyState';
import Pagination from '../Pagination';

const LIMIT = 20;

export default function TeamsDirectory() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const search = searchParams.get('search') || '';

  const [teams, setTeams] = useState<Team[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchTeamsPage({ limit: LIMIT, page })
      .then(({ items, total: t }) => {
        if (!cancelled) {
          setTeams(items);
          setTotal(t);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTeams([]);
          setTotal(0);
          setLoading(false);
        }
      });
    return () => { cancelled = true; };
  }, [page]);

  const totalPages = Math.max(1, Math.ceil((total || 0) / LIMIT));

  const filtered = useMemo(() => {
    const q = localSearch.toLowerCase().trim();
    if (!q) return teams;
    return teams.filter(
      (t) =>
        (t.name || '').toLowerCase().includes(q) ||
        (t.abbr || t.code || '').toLowerCase().includes(q) ||
        (t.country || '').toLowerCase().includes(q) ||
        (t.city || '').toLowerCase().includes(q)
    );
  }, [teams, localSearch]);

  const handleSearchSubmit = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('search', value);
    } else {
      params.delete('search');
    }
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  const handlePageChange = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) {
      params.delete('page');
    } else {
      params.set('page', String(p));
    }
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

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
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit(localSearch); }}
            placeholder="Search teams by name, code or country..."
            className="w-full bg-transparent text-sm text-mtext placeholder:text-stext focus:outline-none"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-accent" size={32} />
        </div>
      ) : filtered.length > 0 ? (
        <>
          <p className="mb-4 text-xs text-stext">
            Showing {filtered.length} of {total} team{total === 1 ? '' : 's'}
          </p>
          <div className="fade-in grid grid-cols-1 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((t) => (
              <TeamCard key={t.id} team={t} />
            ))}
          </div>
          <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
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
