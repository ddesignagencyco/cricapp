'use client';

import { useEffect, useState, useCallback } from 'react';
import { Trophy, Search } from 'lucide-react';
import { fetchTournamentsPage } from '../../../../services/tournaments';
import type { TournamentApi } from '../../../../types';
import Pagination from '../../../../components/admin/AdminPagination';
import {
  AdminAvatar,
  AdminChip,
  AdminPageHeader,
  AdminResultCount,
  LoadingState,
  EmptyState,
  AdminInput,
} from '../../../../components/admin/AdminShared';
import { cap } from '../../../../utils/helpers';

function seasonLabel(t: TournamentApi) {
  return t.currentSeason?.name || String(t.currentSeason?.year || '') || '';
}

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<TournamentApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const limit = 20;

  useEffect(() => {
    const timer = setTimeout(() => setSearch(query.trim()), 300);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback((p: number) => {
    setLoading(true);
    fetchTournamentsPage({ limit, page: p, q: search || undefined })
      .then((res) => {
        setTournaments(res.items);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      })
      .catch(() => { setTournaments([]); setTotalPages(1); setTotal(0); })
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { setPage(1); }, [search]);
  useEffect(() => { load(page); }, [page, load]);

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Tournaments" subtitle="View all tournaments from the sports data provider." />

      <div className="flex flex-col gap-3 rounded-lg p-3 sm:flex-row sm:items-center" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-muted)' }} />
          <AdminInput type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tournaments..." style={{ paddingLeft: '2.25rem' }} />
        </div>
        <div className="shrink-0 sm:pl-1">
          <AdminResultCount shown={tournaments.length} total={total} noun="tournaments" />
        </div>
      </div>

      {loading ? <LoadingState /> : tournaments.length === 0 ? (
        <EmptyState icon={<Trophy size={28} />} title="No tournaments found" message="Try a different name or clear the search." />
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Tournament</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Format</th>
                  <th className="hidden px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider md:table-cell" style={{ color: 'var(--admin-text-secondary)' }}>Season</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-right" style={{ color: 'var(--admin-text-secondary)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {tournaments.map((t) => {
                  const season = seasonLabel(t);
                  const type = cap(t.type) || 'Cricket';
                  const gender = cap(t.gender);
                  const active = t.status === 'active' || !t.status;
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--admin-border)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-table-row-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <AdminAvatar
                            name={t.name}
                            src={typeof t.logo === 'string' ? t.logo : typeof t.image === 'string' ? t.image : null}
                            size={32}
                          />
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{t.name}</p>
                            <p className="mt-0.5 truncate text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                              {[gender, season].filter(Boolean).join(' · ') || 'No season data'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <AdminChip label={type} tone="accent" />
                          {gender && <AdminChip label={gender} />}
                        </div>
                      </td>
                      <td className="hidden px-4 py-2.5 md:table-cell" style={{ color: 'var(--admin-text-secondary)' }}>{season || '—'}</td>
                      <td className="px-4 py-2.5 text-right">
                        <AdminChip label={String(t.status || 'active')} tone={active ? 'success' : 'neutral'} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5 flex justify-end" style={{ borderTop: '1px solid var(--admin-border)' }}>
            <Pagination page={page} totalPages={totalPages} total={total} limit={limit} onPageChange={setPage} />
          </div>
        </div>
      )}
    </div>
  );
}
