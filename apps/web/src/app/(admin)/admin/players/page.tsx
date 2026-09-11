'use client';

import { useEffect, useState, useCallback } from 'react';
import { UserCircle, Search } from 'lucide-react';
import { fetchPlayersPage } from '../../../../services/players';
import type { Player } from '../../../../types';
import Pagination from '../../../../components/admin/AdminPagination';
import { AdminAvatar, AdminPageHeader, LoadingState, EmptyState, AdminInput } from '../../../../components/admin/AdminShared';
import { cap } from '../../../../utils/helpers';

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const limit = 20;

  const load = useCallback((p: number) => {
    setLoading(true);
    fetchPlayersPage({ limit, page: p, q: query || undefined })
      .then((res) => {
        setPlayers(res.items);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      })
      .catch(() => { setPlayers([]); setTotalPages(1); setTotal(0); })
      .finally(() => setLoading(false));
  }, [query]);

  useEffect(() => { setPage(1); }, [query]);
  useEffect(() => { load(page); }, [page, load]);

  const filtered = players.filter((p) => !query || p.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Players" subtitle="View all players from the sports data provider." />

      <div className="flex items-center gap-3 rounded-lg p-3" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-muted)' }} />
          <AdminInput type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search players..." style={{ paddingLeft: '2.25rem' }} />
        </div>
      </div>

      {loading ? <LoadingState /> : filtered.length === 0 ? (
        <EmptyState icon={<UserCircle size={28} />} title="No players found" />
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Player</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Team</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Country</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Role</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Batting</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Bowling</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => {
                  const displayName = p.fullName || p.name;
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--admin-border)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-table-row-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <AdminAvatar name={displayName} src={typeof p.image === 'string' ? p.image : null} size={28} />
                          <div>
                            <p className="font-semibold" style={{ color: 'var(--admin-text)' }}>{p.name}</p>
                            {p.fullName && p.fullName !== p.name && <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>{p.fullName}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--admin-text-secondary)' }}>{cap(p.teamName)}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--admin-text-secondary)' }}>{cap(p.country)}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--admin-text-secondary)' }}>{cap(p.role)}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--admin-text-secondary)' }}>{cap(p.battingStyle)}</td>
                      <td className="px-4 py-2.5 text-xs" style={{ color: 'var(--admin-text-secondary)' }}>{cap(p.bowlingStyle)}</td>
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
