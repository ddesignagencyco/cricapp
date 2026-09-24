'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import SearchField from '../SearchField';
import DirectoryPageHeader from '../DirectoryPageHeader';
import PlayerCard from '../PlayerCard';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import Pagination from '../Pagination';
import DummyAd from '../advertisements/DummyAd';
import { DirectoryGridSkeleton } from '../skeletons/Skeletons';
import { useDebouncedUrlQuery } from '../../hooks/useDebouncedUrlQuery';
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
  const { input: localSearch, setInput: setLocalSearch } = useDebouncedUrlQuery({ param: 'search' });
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
      <DirectoryPageHeader
        eyebrow="International & league athletes"
        title="Cricket Players Directory"
        description="Explore profiles, batting and bowling styles, and team affiliations for international and league cricketers."
        count={total}
        countLabel="players"
      />

      {!loading && !error && filtered.length > 0 ? (
        <DummyAd size="leaderboard" placement="players-after-intro" />
      ) : null}

      {/* Search & Role Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchField
          wrapperClassName="max-w-md flex-1"
          aria-label="Search players"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search players by name, team, role, nationality…"
        />

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
        <DirectoryGridSkeleton />
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
