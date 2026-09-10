'use client';

import { useEffect, useState, useCallback } from 'react';
import { Users, Search } from 'lucide-react';
import { fetchTeamsPage } from '../../../../services/teams';
import type { Team } from '../../../../types';
import Pagination from '../../../../components/admin/AdminPagination';
import { AdminPageHeader, LoadingState, EmptyState, AdminInput } from '../../../../components/admin/AdminShared';
import { getInitials, cap } from '../../../../utils/helpers';

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const limit = 20;

  const load = useCallback((p: number) => {
    setLoading(true);
    fetchTeamsPage({ limit, page: p })
      .then((res) => {
        setTeams(res.items);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      })
      .catch(() => { setTeams([]); setTotalPages(1); setTotal(0); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(page); }, [page, load]);

  const filtered = teams.filter((t) => !query || t.name.toLowerCase().includes(query.toLowerCase()) || (t.shortName || '').toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Teams" subtitle="View all teams from the sports data provider." />

      <div className="flex items-center gap-3 rounded-lg p-3" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-muted)' }} />
          <AdminInput type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search teams..." style={{ paddingLeft: '2.25rem' }} />
        </div>
      </div>

      {loading ? <LoadingState /> : filtered.length === 0 ? (
        <EmptyState icon={<Users size={28} />} title="No teams found" />
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Team</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Code</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>City</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Country</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const code = t.shortName || t.code || '';
                  const badgeLabel = t.name || code || '?';
                  return (
                    <tr key={t.id} style={{ borderBottom: '1px solid var(--admin-border)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-table-row-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2.5">
                          {t.logo ? (
                            <img src={t.logo} alt={t.name} className="h-7 w-7 rounded-full object-cover" style={{ border: '1px solid var(--admin-border)' }} />
                          ) : (
                            <TeamBadge code={badgeLabel} />
                          )}
                          <span style={{ color: 'var(--admin-text)' }}>{t.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold" style={{ color: 'var(--admin-text)' }}>{code || '—'}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--admin-text-secondary)' }}>{cap(t.city)}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--admin-text-secondary)' }}>{cap(t.country)}</td>
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

function TeamBadge({ code }: { code: string }) {
  if (!code) return null;
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);
  return (
    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
      style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 40) % 360}, 80%, 35%))` }}>
      {getInitials(code)}
    </span>
  );
}
