'use client';

import { useEffect, useState, useCallback } from 'react';
import { Trophy, Search } from 'lucide-react';
import { fetchMatchesPage } from '../../../../services/matches';
import type { Match } from '../../../../types';
import Pagination from '../../../../components/admin/AdminPagination';
import { AdminPageHeader, LoadingState, EmptyState, StatusBadge, AdminInput } from '../../../../components/admin/AdminShared';
import { getInitials } from '../../../../utils/helpers';

export default function MatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState('all');
  const [query, setQuery] = useState('');
  const limit = 20;

  const load = useCallback((p: number) => {
    setLoading(true);
    const params: Record<string, string | number | boolean | undefined | null> = { limit, page: p };
    if (filterStatus !== 'all') params.status = filterStatus;
    fetchMatchesPage(params)
      .then((res) => {
        setMatches(res.items);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      })
      .catch(() => { setMatches([]); setTotalPages(1); setTotal(0); })
      .finally(() => setLoading(false));
  }, [filterStatus]);

  useEffect(() => { setPage(1); }, [filterStatus]);
  useEffect(() => { load(page); }, [page, load]);

  const filtered = matches.filter((m) => {
    if (!query) return true;
    const q = query.toLowerCase();
    const teams = m.teams;
    const isObj = teams && typeof teams === 'object' && !Array.isArray(teams);
    const home = isObj ? (teams.home?.name || teams.home?.code) : Array.isArray(teams) ? teams[0] : '';
    const away = isObj ? (teams.away?.name || teams.away?.code) : Array.isArray(teams) ? teams[1] : '';
    return (home || '').toLowerCase().includes(q) || (away || '').toLowerCase().includes(q) || (m.tournament || '').toLowerCase().includes(q) || (m.venue || '').toLowerCase().includes(q);
  });

  const getTeamInfo = (m: Match) => {
    const teams = m.teams;
    const isObj = teams && typeof teams === 'object' && !Array.isArray(teams);
    const names = m.teamNames || [];

    const rawHomeCode = isObj ? teams.home?.code : Array.isArray(teams) ? teams[0] : '';
    const rawAwayCode = isObj ? teams.away?.code : Array.isArray(teams) ? teams[1] : '';

    const homeName =
      (names[0] && !names[0].startsWith('sr:'))
        ? names[0]
        : (isObj && teams.home?.name && !teams.home.name.startsWith('sr:'))
        ? teams.home.name
        : (rawHomeCode || 'TBA').replace(/^sr:competitor:/, 'Team ');

    const awayName =
      (names[1] && !names[1].startsWith('sr:'))
        ? names[1]
        : (isObj && teams.away?.name && !teams.away.name.startsWith('sr:'))
        ? teams.away.name
        : (rawAwayCode || 'TBA').replace(/^sr:competitor:/, 'Team ');

    return {
      homeName,
      awayName,
    };
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader title="Matches" subtitle="View and manage match schedules, scores and results." />

      <div className="flex flex-col gap-3 rounded-lg p-3 md:flex-row md:items-center" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
        <div className="relative flex-1">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--admin-text-muted)' }} />
          <AdminInput type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by team, tournament or venue..." style={{ paddingLeft: '2.25rem' }} />
        </div>
        <div className="flex gap-1.5">
          {['all', 'live', 'upcoming', 'completed'].map((s) => (
            <button key={s} type="button" onClick={() => setFilterStatus(s)} className="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors"
              style={{
                background: filterStatus === s ? 'var(--admin-accent)' : 'var(--admin-input-bg)',
                color: filterStatus === s ? '#fff' : 'var(--admin-text-secondary)',
                border: filterStatus === s ? 'none' : '1px solid var(--admin-border)',
              }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? <LoadingState /> : filtered.length === 0 ? (
        <EmptyState icon={<Trophy size={28} />} title="No matches found" message="No matches match your current filters." />
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Teams</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Score</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Tournament</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Venue</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Date</th>
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-right" style={{ color: 'var(--admin-text-secondary)' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => {
                  const t = getTeamInfo(m);
                  const inn = m.currentInnings;
                  const homeLabel = t.homeName;
                  const awayLabel = t.awayName;
                  return (
                    <tr key={m.matchId || m.id} style={{ borderBottom: '1px solid var(--admin-border)' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-table-row-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                      <td className="px-4 py-2.5">
                        <div className="flex flex-col gap-1.5 py-0.5">
                          <div className="flex items-center gap-2">
                            <TeamBadge code={homeLabel} />
                            <span className="font-bold text-xs" style={{ color: 'var(--admin-text)' }}>{homeLabel}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <TeamBadge code={awayLabel} />
                            <span className="font-bold text-xs" style={{ color: 'var(--admin-text)' }}>{awayLabel}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono font-bold" style={{ color: 'var(--admin-text)' }}>
                        {inn ? `${inn.runs}/${inn.wickets} (${inn.overs})` : '—'}
                      </td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--admin-text-secondary)' }}>{m.tournament || '—'}</td>
                      <td className="px-4 py-2.5 max-w-[120px] truncate" style={{ color: 'var(--admin-text-muted)' }}>{m.venue || '—'}</td>
                      <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--admin-text-muted)' }}>
                        {m.scheduled ? new Date(m.scheduled).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right"><StatusBadge status={m.status} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2.5" style={{ borderTop: '1px solid var(--admin-border)' }}>
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
    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold text-white"
      style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 40) % 360}, 80%, 35%))` }}>
      {getInitials(code)}
    </span>
  );
}
