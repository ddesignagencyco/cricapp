'use client';

import { useEffect, useState, useCallback } from 'react';
import { Trophy, Search } from 'lucide-react';
import { fetchTournamentsPage } from '../../../../services/tournaments';
import type { TournamentApi } from '../../../../types';
import Pagination from '../../../../components/admin/AdminPagination';
import { AdminPageHeader, LoadingState, EmptyState, AdminInput } from '../../../../components/admin/AdminShared';
import { cap } from '../../../../utils/helpers';

export default function TournamentsPage() {
  const [tournaments, setTournaments] = useState<TournamentApi[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const limit = 20;

  const load = useCallback((p: number) => {
    setLoading(true);
    fetchTournamentsPage({ limit, page: p })
      .then((res) => {
        setTournaments(res.items);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      })
      .catch(() => { setTournaments([]); setTotalPages(1); setTotal(0); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  const filtered = tournaments.filter((t) => !query || t.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Tournaments" subtitle="View all tournaments from the sports data provider." />

      <div className="flex items-center gap-3 rounded-lg p-3" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-muted)' }} />
          <AdminInput type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search tournaments..." style={{ paddingLeft: '2.25rem' }} />
        </div>
      </div>

      {loading ? <LoadingState /> : filtered.length === 0 ? (
        <EmptyState icon={<Trophy size={28} />} title="No tournaments found" />
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Tournament</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Type</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Gender</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Season</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--admin-border)' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-table-row-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td className="px-4 py-2.5 font-bold" style={{ color: 'var(--admin-text)' }}>{t.name}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--admin-text-secondary)' }}>{cap(t.type) || 'Cricket'}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--admin-text-secondary)' }}>{cap(t.gender)}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--admin-text-secondary)' }}>{t.currentSeason?.name || String(t.currentSeason?.year || '') || '—'}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--admin-text-secondary)' }}>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold"
                        style={{
                          background: t.status === 'active' ? 'var(--admin-success-bg)' : 'var(--admin-input-bg)',
                          color: t.status === 'active' ? 'var(--admin-success)' : 'var(--admin-text-muted)',
                        }}>
                        {String(t.status || 'active')}
                      </span>
                    </td>
                  </tr>
                ))}
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
