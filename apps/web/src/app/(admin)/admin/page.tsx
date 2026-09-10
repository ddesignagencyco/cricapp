'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import { FileText, Trophy, Users, UserCircle, Activity, ArrowUpRight } from 'lucide-react';
import { useAuth } from '../../../components/AuthProvider';
import { fetchMatchesPage } from '../../../services/matches';
import { fetchNewsAdmin } from '../../../services/newsAdmin';
import type { Match } from '../../../types';
import Pagination from '../../../components/admin/AdminPagination';
import { StatCard, LoadingState, StatusBadge } from '../../../components/admin/AdminShared';
import { getInitials } from '../../../utils/helpers';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Matches
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchPage, setMatchPage] = useState(1);
  const [matchTotalPages, setMatchTotalPages] = useState(1);
  const [matchTotal, setMatchTotal] = useState(0);

  // Recent articles
  const [recentArticles, setRecentArticles] = useState<any[]>([]);

  const loadMatches = useCallback((p: number) => {
    fetchMatchesPage({ limit: 5, page: p })
      .then((res) => { setMatches(res.items); setMatchTotalPages(res.totalPages); setMatchTotal(res.total); })
      .catch(() => { setMatches([]); setMatchTotalPages(1); setMatchTotal(0); });
  }, []);

  useEffect(() => {
    fetchNewsAdmin({ limit: 10 })
      .then((res) => setRecentArticles(res.items))
      .catch(() => {});
    loadMatches(1);
    setLoading(false);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadMatches(matchPage); }, [matchPage, loadMatches]);

  const userName = user?.displayName || user?.username || 'Admin';
  if (loading) return <LoadingState />;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--admin-text)' }}>
            Welcome back, {userName.split(' ')[0]}
          </h1>
          <p className="text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
            Here&apos;s what&apos;s happening across PakCricZone today.
          </p>
        </div>
        <Link
          href="/admin/articles"
          className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-xs font-bold text-white transition-colors"
          style={{ background: 'var(--admin-accent)' }}
        >
          <FileText size={14} /> Create article
        </Link>
      </div>

      {/* Stat Cards — hardcoded until stats API is built */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Published Articles" value={12} icon={<FileText size={14} />} />
        <StatCard label="Total Matches" value={48} icon={<Activity size={14} />} color="var(--admin-danger)" bgColor="var(--admin-danger-bg)" />
        <StatCard label="Teams" value={36} icon={<Users size={14} />} color="var(--admin-success)" bgColor="var(--admin-success-bg)" />
        <StatCard label="Players" value={450} icon={<UserCircle size={14} />} color="var(--admin-info)" bgColor="var(--admin-info-bg)" />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-5 lg:col-span-2">

          {/* ─── Matches Table ─── */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span style={{ color: 'var(--admin-accent)' }}><Trophy size={14} /></span>
              <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text)' }}>Recent Matches</h2>
            </div>
            <Link href="/admin/matches" className="text-xs font-bold" style={{ color: 'var(--admin-accent)' }}>View all →</Link>
          </div>
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}>
                    <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Status</th>
                    <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Teams</th>
                    <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Score</th>
                    <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Tournament</th>
                    <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center" style={{ color: 'var(--admin-text-muted)' }}>No matches yet</td></tr>
                  ) : matches.map((m) => {
                    const isObj = m.teams && typeof m.teams === 'object' && !Array.isArray(m.teams);
                    const homeCode = isObj ? m.teams!.home?.code : Array.isArray(m.teams) ? m.teams[0] : '';
                    const awayCode = isObj ? m.teams!.away?.code : Array.isArray(m.teams) ? m.teams[1] : '';
                    const homeName = isObj ? m.teams!.home?.name : '';
                    const awayName = isObj ? m.teams!.away?.name : '';
                    const homeLabel = homeName || homeCode || 'TBA';
                    const awayLabel = awayName || awayCode || 'TBA';
                    const inn = m.currentInnings;
                    return (
                      <tr key={m.matchId || m.id} style={{ borderBottom: '1px solid var(--admin-border)' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-table-row-hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                        <td className="px-4 py-2.5"><StatusBadge status={m.status} /></td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1.5">
                            <TeamBadge code={homeLabel} />
                            <span className="font-bold" style={{ color: 'var(--admin-text)' }}>{homeLabel}</span>
                            <span style={{ color: 'var(--admin-text-muted)' }}>vs</span>
                            <TeamBadge code={awayLabel} />
                            <span className="font-bold" style={{ color: 'var(--admin-text)' }}>{awayLabel}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 font-mono font-bold" style={{ color: 'var(--admin-text)' }}>
                          {inn ? `${inn.runs}/${inn.wickets} (${inn.overs})` : '—'}
                        </td>
                        <td className="px-4 py-2.5" style={{ color: 'var(--admin-text-secondary)' }}>{m.tournament || '—'}</td>
                        <td className="px-4 py-2.5 font-mono" style={{ color: 'var(--admin-text-muted)' }}>
                          {m.scheduled ? new Date(m.scheduled).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-2.5 flex justify-end" style={{ borderTop: '1px solid var(--admin-border)' }}>
              <Pagination page={matchPage} totalPages={matchTotalPages} total={matchTotal} limit={5} onPageChange={setMatchPage} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Quick publish */}
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
              <h3 className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>Quick publish</h3>
            </div>
            <div className="space-y-1.5 p-3">
              <Link href="/admin/articles" className="flex items-center gap-2.5 rounded-md p-2.5 transition-colors" style={{ border: '1px solid var(--admin-border)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-table-row-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <div className="grid h-7 w-7 place-items-center rounded-md" style={{ background: 'var(--admin-success-bg)', color: 'var(--admin-success)' }}><FileText size={13} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>Article</p>
                  <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Write and publish</p>
                </div>
                <ArrowUpRight size={12} style={{ color: 'var(--admin-text-muted)' }} />
              </Link>
              <Link href="/admin/matches" className="flex items-center gap-2.5 rounded-md p-2.5 transition-colors" style={{ border: '1px solid var(--admin-border)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-table-row-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <div className="grid h-7 w-7 place-items-center rounded-md" style={{ background: 'var(--admin-info-bg)', color: 'var(--admin-info)' }}><Trophy size={13} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>Match update</p>
                  <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Post live scores</p>
                </div>
                <ArrowUpRight size={12} style={{ color: 'var(--admin-text-muted)' }} />
              </Link>
            </div>
          </div>

          {/* Recent activity */}
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
              <h3 className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>Recent activity</h3>
              <Link href="/admin/articles" className="text-xs font-bold" style={{ color: 'var(--admin-accent)' }}>View all →</Link>
            </div>
            <div>
              {recentArticles.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs" style={{ color: 'var(--admin-text-muted)' }}>No recent activity</p>
              ) : recentArticles.slice(0, 6).map((a: any) => (
                <div key={a.id} className="flex items-start gap-2.5 px-4 py-2.5" style={{ borderBottom: '1px solid var(--admin-border)' }}
                  onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-table-row-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                  <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded text-[10px] font-bold" style={{ background: 'var(--admin-success-bg)', color: 'var(--admin-success)' }}>
                    <FileText size={11} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--admin-text)' }}>{a.title}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--admin-text-muted)' }}>
                      {a.isPublished ? 'Published' : 'Draft'} · {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
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
