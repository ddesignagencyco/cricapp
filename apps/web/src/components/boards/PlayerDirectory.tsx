'use client';

import { Fragment, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import SearchField from '../SearchField';
import DirectoryPageHeader from '../DirectoryPageHeader';
import PlayerCard from '../PlayerCard';
import EmptyState from '../EmptyState';
import ErrorState from '../ErrorState';
import Pagination from '../Pagination';
import AdSlot from '../advertisements/AdSlot';
import EditorialSidebar from './EditorialSidebar';
import { DirectoryGridSkeleton } from '../skeletons/Skeletons';
import { useDebouncedUrlQuery } from '../../hooks/useDebouncedUrlQuery';
import { fetchPlayersPage } from '../../services/players';
import { playerKeys, parsePositiveInt } from '../../queries/keys';
import { usePlayersQuery, usePrefetchNextPage } from '../../queries/useDirectoryQueries';
import type { Player } from '../../types/index';

const LIMIT = 24;
const EMPTY_PLAYERS: Player[] = [];

export function formatRole(role: string): string {
  if (!role || role === 'all') return 'All Roles';
  const clean = role.replace(/_/g, ' ').trim();
  return clean
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function PlayerDirectory() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const page = parsePositiveInt(searchParams.get('page'), 1);
  const { input: localSearch, setInput: setLocalSearch, query: searchQuery } = useDebouncedUrlQuery({ param: 'search' });
  const search = searchQuery.trim();
  const roleFilter = searchParams.get('role') || 'all';

  const listParams = {
    limit: LIMIT,
    page,
    q: search || undefined,
    role: roleFilter === 'all' ? undefined : roleFilter,
  };
  const query = usePlayersQuery(listParams);
  const players = query.data?.items ?? EMPTY_PLAYERS;
  const total = query.data?.total || 0;
  const totalPages = Math.max(1, query.data?.totalPages || Math.ceil((total || 0) / LIMIT));

  const roles = useMemo(() => {
    const serverRoles = query.data?.facets?.roles?.map((r) => r.key) ?? [];
    if (serverRoles.length > 0) return ['all', ...serverRoles];
    const set = new Set<string>();
    for (const p of players) {
      if (p.role && typeof p.role === 'string') set.add(p.role);
    }
    return ['all', ...Array.from(set)];
  }, [query.data?.facets?.roles, players]);

  // Role + search filtering is performed server-side across all paginated records.
  const filtered = players;

  const nextParams = { ...listParams, page: page + 1 };
  usePrefetchNextPage({
    page,
    totalPages,
    enabled: Boolean(query.data && !query.isPlaceholderData && query.isSuccess),
    queryKey: playerKeys.list(nextParams),
    queryFn: (signal) => fetchPlayersPage(nextParams, signal),
  });

  const handlePageChange = (p: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (p <= 1) params.delete('page');
    else params.set('page', String(p));
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const handleRoleFilterChange = (role: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (role === 'all') params.delete('role');
    else params.set('role', role);
    params.delete('page');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };

  const clearSearch = () => {
    setLocalSearch('');
    const params = new URLSearchParams(searchParams.toString());
    params.delete('search');
    params.delete('role');
    params.delete('page');
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
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

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SearchField
          wrapperClassName="max-w-md flex-1"
          aria-label="Search players"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search players by name, team, role, nationality…"
        />

        {roles.length > 1 && (
          <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {roles.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => handleRoleFilterChange(r)}
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

      <div className="flex items-center justify-between text-xs text-stext">
        <p>
          Showing <span className="font-bold text-mtext">{filtered.length}</span> of {total} athlete{total === 1 ? '' : 's'}
          {search ? ` matching "${search}"` : ''}
        </p>
        {query.isFetching && !query.isPending ? <span>Updating…</span> : null}
      </div>

      {query.isPending ? (
        <DirectoryGridSkeleton />
      ) : query.isError ? (
        <ErrorState message="Players are temporarily unavailable." onRetry={() => void query.refetch()} />
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <div className="fade-in grid grid-cols-1 gap-3 sm:grid-cols-2">
              {filtered.map((p: Player, index) => (
                <Fragment key={p.id}>
                  <PlayerCard player={p} />
                  {(index + 1) % 6 === 0 && index < filtered.length - 1 ? (
                    <div className="col-span-full py-1">
                      <AdSlot placement="players-infeed" />
                    </div>
                  ) : null}
                </Fragment>
              ))}
            </div>

            <div className="pt-4">
              <Pagination page={page} totalPages={totalPages} total={total} limit={LIMIT} onPageChange={handlePageChange} />
            </div>
          </div>
          <EditorialSidebar
            topPlacement="players-sidebar"
            bottomPlacement={filtered.length >= 14 ? 'players-skyscraper' : undefined}
            variant="directory"
          />
        </div>
      ) : (
        <EmptyState
          title="No players found"
          message={
            search
              ? `No athletes match "${search}".`
              : roleFilter !== 'all'
                ? 'No athletes match your current role filter.'
                : 'No players are currently listed in this directory.'
          }
        >
          {search || roleFilter !== 'all' ? (
            <button
              type="button"
              onClick={clearSearch}
              className="rounded-md border border-lborder bg-card px-4 py-2 text-sm font-semibold text-mtext transition-colors hover:bg-[var(--color-row-hover)]"
            >
              Clear search and filters
            </button>
          ) : null}
        </EmptyState>
      )}
    </div>
  );
}
