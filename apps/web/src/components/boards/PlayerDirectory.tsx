'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Search, Users } from 'lucide-react';
import PlayerCard from '../PlayerCard';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import Pagination from '../Pagination';
import { fetchPlayersPage } from '../../services/players';
import type { Player } from '../../types/index';

const LIMIT = 24;

export function formatRole(role: string): string {
  if (!role || role === 'all') return 'All Roles';
  const clean = role.replace(/_/g, ' ').trim();
  return clean
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

interface Props {
  initialPlayers?: Player[];
  initialTotal?: number;
}

export default function PlayerDirectory({ initialPlayers = [], initialTotal = 0 }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const search = searchParams.get('search') || '';

  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [total, setTotal] = useState(initialTotal || initialPlayers.length);
  const [totalPages, setTotalPages] = useState(
    Math.max(1, Math.ceil((initialTotal || initialPlayers.length) / LIMIT))
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const [localSearch, setLocalSearch] = useState(search);
  const [roleFilter, setRoleFilter] = useState('all');

  // Load players when page or search changes
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);

    fetchPlayersPage({
      limit: LIMIT,
      page,
      q: search || undefined,
    })
      .then((res) => {
        if (!cancelled) {
          setPlayers(res.items);
          setTotal(res.total);
          setTotalPages(Math.max(1, res.totalPages || Math.ceil(res.total / LIMIT)));
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPlayers([]);
          setTotal(0);
          setError(true);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [page, search, retryKey]);

  const roles = useMemo(() => {
    const set = new Set<string>();
    for (const p of players || []) {
      if (p.role && typeof p.role === 'string') set.add(p.role);
    }
    return ['all', ...Array.from(set)];
  }, [players]);

  const filtered = useMemo(() => {
    let list = players || [];
    if (roleFilter !== 'all') {
      list = list.filter((p) => p.role?.toLowerCase() === roleFilter.toLowerCase());
    }
    return list;
  }, [players, roleFilter]);

  const handleSearchSubmit = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const val = value.trim();
    if (val) {
      params.set('search', val);
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
    <div className="space-y-5">
      <header className="rounded-md border border-lborder bg-card p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-accent">
              <Users size={13} />
              <span>International & League Athletes</span>
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-mtext">
              Cricket Players Directory
            </h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-stext">
              Explore profiles, batting & bowling styles, career statistics, and team affiliations for world-class cricketers and emerging stars.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-md border border-lborder bg-secondary px-4 py-3">
            <div className="btn-brand grid h-9 w-9 place-items-center rounded-md">
              <Users size={18} />
            </div>
            <div>
              <div className="text-lg font-semibold leading-none text-mtext">{total}</div>
              <div className="mt-1 text-xs font-medium uppercase tracking-wider text-stext">
                Total Athletes
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Search & Role Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search
            size={16}
            className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stext"
          />
          <input
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSearchSubmit(localSearch);
            }}
            placeholder="Search players by name, team, role, nationality…"
            className="w-full rounded-md border border-lborder bg-card py-2.5 pl-10 pr-4 text-sm text-mtext outline-none transition-colors focus:border-accent focus:bg-elevated focus:ring-2 focus:ring-accent/20"
          />
        </div>

        {/* Role Filter Chips */}
        {roles.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {roles.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`rounded px-3 py-1.5 text-xs font-medium transition-colors ${
                  roleFilter === r
                    ? 'btn-brand'
                    : 'border border-lborder bg-card text-stext hover:text-mtext hover:bg-secondary'
                }`}
              >
                {formatRole(r)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between text-xs text-stext">
        <p>
          Showing <span className="font-bold text-mtext">{filtered.length}</span> of {total} athlete{total === 1 ? '' : 's'}
          {search ? ` matching "${search}"` : ''}
        </p>
      </div>

      {/* Grid Content */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="h-[78px] animate-pulse rounded-md border border-lborder bg-card" />
          ))}
        </div>
      ) : error ? (
        <ErrorState message="Players are temporarily unavailable." onRetry={() => setRetryKey((key) => key + 1)} />
      ) : filtered.length > 0 ? (
        <>
          <div className="fade-in grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((p) => (
              <PlayerCard key={p.id} player={p} />
            ))}
          </div>

          <div className="pt-4">
            <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={handlePageChange} />
          </div>
        </>
      ) : (
        <EmptyState
          title="No players found"
          message={
            localSearch || search || roleFilter !== 'all'
              ? 'No athletes match your current search or role filter. Try resetting your filters.'
              : 'No players are currently listed in this directory.'
          }
        />
      )}
    </div>
  );
}
