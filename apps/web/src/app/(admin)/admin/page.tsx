'use client';

import Link from 'next/link';
import { useEffect, useState, useCallback } from 'react';
import {
  FileText,
  Trophy,
  Users,
  UserCircle,
  Activity,
  ArrowUpRight,
  Radio,
  Newspaper,
  CheckCircle2,
  Database,
  Globe2,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../../components/AuthProvider';
import { fetchMatchesPage } from '../../../services/matches';
import { fetchNewsAdmin } from '../../../services/newsAdmin';
import { fetchTeamsPage } from '../../../services/teams';
import { fetchPlayersPage } from '../../../services/players';
import { fetchTournamentsPage } from '../../../services/tournaments';
import type { Match } from '../../../types';
import Pagination from '../../../components/admin/AdminPagination';
import { LoadingState, StatusBadge } from '../../../components/admin/AdminShared';
import { getInitials } from '../../../utils/helpers';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  // Matches
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchPage, setMatchPage] = useState(1);
  const [matchTotalPages, setMatchTotalPages] = useState(1);
  const [matchTotal, setMatchTotal] = useState(0);

  // Counts / KPIs
  const [counts, setCounts] = useState({
    articles: 0,
    matches: 0,
    liveMatches: 0,
    teams: 0,
    players: 0,
    tournaments: 0,
  });

  // Recent articles
  const [recentArticles, setRecentArticles] = useState<any[]>([]);

  const loadMatches = useCallback((p: number) => {
    fetchMatchesPage({ limit: 5, page: p })
      .then((res) => {
        setMatches(res.items);
        setMatchTotalPages(res.totalPages);
        setMatchTotal(res.total);
      })
      .catch(() => {
        setMatches([]);
        setMatchTotalPages(1);
        setMatchTotal(0);
      });
  }, []);

  useEffect(() => {
    Promise.allSettled([
      fetchNewsAdmin({ limit: 6 }),
      fetchMatchesPage({ limit: 5, page: 1 }),
      fetchMatchesPage({ status: 'live', limit: 1 }),
      fetchTeamsPage({ limit: 1 }),
      fetchPlayersPage({ limit: 1 }),
      fetchTournamentsPage({ limit: 1 }),
    ]).then(([newsRes, matchRes, liveRes, teamRes, playerRes, tourRes]) => {
      if (newsRes.status === 'fulfilled') {
        setRecentArticles(newsRes.value.items || []);
        setCounts((c) => ({ ...c, articles: newsRes.value.total || 0 }));
      }
      if (matchRes.status === 'fulfilled') {
        setMatches(matchRes.value.items || []);
        setMatchTotalPages(matchRes.value.totalPages || 1);
        setMatchTotal(matchRes.value.total || 0);
        setCounts((c) => ({ ...c, matches: matchRes.value.total || 0 }));
      }
      if (liveRes.status === 'fulfilled') {
        setCounts((c) => ({ ...c, liveMatches: liveRes.value.total || 0 }));
      }
      if (teamRes.status === 'fulfilled') {
        setCounts((c) => ({ ...c, teams: teamRes.value.total || 0 }));
      }
      if (playerRes.status === 'fulfilled') {
        setCounts((c) => ({ ...c, players: playerRes.value.total || 0 }));
      }
      if (tourRes.status === 'fulfilled') {
        setCounts((c) => ({ ...c, tournaments: tourRes.value.total || 0 }));
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    loadMatches(matchPage);
  }, [matchPage, loadMatches]);

  const getTeamInfo = (m: Match) => {
    const teams = m.teams;
    const isObj = teams && typeof teams === 'object' && !Array.isArray(teams);
    const names = m.teamNames || [];

    const rawHomeCode = isObj ? teams.home?.code : Array.isArray(teams) ? teams[0] : '';
    const rawAwayCode = isObj ? teams.away?.code : Array.isArray(teams) ? teams[1] : '';

    const homeName =
      names[0] && !names[0].startsWith('sr:')
        ? names[0]
        : isObj && teams.home?.name && !teams.home.name.startsWith('sr:')
        ? teams.home.name
        : (rawHomeCode || 'TBA').replace(/^sr:competitor:/, 'Team ');

    const awayName =
      names[1] && !names[1].startsWith('sr:')
        ? names[1]
        : isObj && teams.away?.name && !teams.away.name.startsWith('sr:')
        ? teams.away.name
        : (rawAwayCode || 'TBA').replace(/^sr:competitor:/, 'Team ');

    return { homeName, awayName };
  };

  const userName = user?.displayName || user?.username || 'Admin';
  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider"
              style={{ background: 'rgba(0, 191, 255, 0.12)', color: 'var(--admin-accent)' }}
            >
              <Activity size={12} className="animate-pulse" /> Live CMS Engine
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--admin-text)' }}>
            Welcome back, {userName.split(' ')[0]}
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
            Platform metrics, match feeds, and editorial activity overview.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin/matches"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-bold transition-colors"
            style={{
              border: '1px solid var(--admin-border)',
              background: 'var(--admin-card)',
              color: 'var(--admin-text)',
            }}
          >
            <Trophy size={13} style={{ color: 'var(--admin-accent)' }} /> Manage Matches
          </Link>
          <Link
            href="/admin/news/new"
            className="inline-flex items-center gap-1.5 rounded-md px-3.5 py-2 text-xs font-bold text-white transition-colors"
            style={{ background: 'var(--admin-accent)' }}
          >
            <FileText size={13} /> New Article
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
        <MetricCard
          label="Live Matches"
          value={counts.liveMatches}
          sub={counts.liveMatches > 0 ? 'Action in progress' : 'No matches live'}
          icon={<Radio size={14} className={counts.liveMatches > 0 ? 'animate-pulse' : ''} />}
          badge={counts.liveMatches > 0 ? 'Live' : undefined}
          accentColor="var(--admin-danger)"
          accentBg="var(--admin-danger-bg)"
        />
        <MetricCard
          label="Total Matches"
          value={counts.matches > 0 ? counts.matches.toLocaleString() : matchTotal.toLocaleString()}
          sub="Catalog fixtures"
          icon={<Trophy size={14} />}
          accentColor="var(--admin-accent)"
          accentBg="rgba(0, 191, 255, 0.12)"
        />
        <MetricCard
          label="Articles"
          value={counts.articles.toLocaleString()}
          sub="News & reports"
          icon={<FileText size={14} />}
          accentColor="var(--admin-warning)"
          accentBg="var(--admin-warning-bg)"
        />
        <MetricCard
          label="Comments"
          value="Unavailable"
          sub="Admin feed API required"
          icon={<MessageSquare size={14} />}
          accentColor="var(--admin-accent)"
          accentBg="var(--admin-info-bg)"
        />
        <MetricCard
          label="Teams"
          value={counts.teams.toLocaleString()}
          sub="Clubs & nations"
          icon={<Users size={14} />}
          accentColor="var(--admin-success)"
          accentBg="var(--admin-success-bg)"
        />
        <MetricCard
          label="Players"
          value={counts.players.toLocaleString()}
          sub="Rosters & profiles"
          icon={<UserCircle size={14} />}
          accentColor="var(--admin-info)"
          accentBg="var(--admin-info-bg)"
        />
        <MetricCard
          label="Tournaments"
          value={counts.tournaments.toLocaleString()}
          sub="Leagues & series"
          icon={<Newspaper size={14} />}
          accentColor="var(--admin-accent)"
          accentBg="rgba(0, 191, 255, 0.12)"
        />
      </div>

      {/* Secondary Performance & Health Strip */}
      <div
        className="grid grid-cols-1 gap-3 rounded-lg p-4 sm:grid-cols-4 sm:divide-x"
        style={{
          border: '1px solid var(--admin-border)',
          background: 'var(--admin-card)',
          borderColor: 'var(--admin-border)',
        }}
      >
        <div className="flex items-center gap-3 sm:pr-4">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
            style={{ background: 'var(--admin-success-bg)', color: 'var(--admin-success)' }}
          >
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>Ingestion Pipeline</p>
            <p className="text-xs" style={{ color: 'var(--admin-text-secondary)' }}>Sportradar live stream active</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:px-4">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
            style={{ background: 'rgba(0, 191, 255, 0.12)', color: 'var(--admin-accent)' }}
          >
            <Database size={18} />
          </div>
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>Redis Cache & Storage</p>
            <p className="text-xs" style={{ color: 'var(--admin-text-secondary)' }}>Optimized real-time memory</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:px-4">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
            style={{ background: 'var(--admin-success-bg)', color: 'var(--admin-success)' }}
          >
            <ShieldCheck size={18} />
          </div>
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>Security & Roles</p>
            <p className="text-xs" style={{ color: 'var(--admin-text-secondary)' }}>Protected admin gateway</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:pl-4">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
            style={{ background: 'rgba(255, 209, 102, 0.12)', color: 'var(--admin-warning)' }}
          >
            <Globe2 size={18} />
          </div>
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>Global Delivery</p>
            <p className="text-xs" style={{ color: 'var(--admin-text-secondary)' }}>Low latency edge sync</p>
          </div>
        </div>
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
                    <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Teams</th>
                    <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Score</th>
                    <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Tournament</th>
                    <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Date</th>
                    <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-right" style={{ color: 'var(--admin-text-secondary)' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center" style={{ color: 'var(--admin-text-muted)' }}>No matches yet</td></tr>
                  ) : matches.map((m) => {
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
            <div className="px-4 py-2.5 flex justify-end" style={{ borderTop: '1px solid var(--admin-border)' }}>
              <Pagination page={matchPage} totalPages={matchTotalPages} total={matchTotal} limit={5} onPageChange={setMatchPage} />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Quick actions */}
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
              <h3 className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>Quick Actions</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-1.5 p-3">
              <Link href="/admin/news/new" className="flex items-center gap-2.5 rounded-md p-2.5 transition-colors" style={{ border: '1px solid var(--admin-border)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-table-row-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <div className="grid h-7 w-7 place-items-center rounded-md" style={{ background: 'var(--admin-success-bg)', color: 'var(--admin-success)' }}><FileText size={13} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>Write Story</p>
                  <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Publish news & match reports</p>
                </div>
                <ArrowUpRight size={12} style={{ color: 'var(--admin-text-muted)' }} />
              </Link>
              <Link href="/admin/matches" className="flex items-center gap-2.5 rounded-md p-2.5 transition-colors" style={{ border: '1px solid var(--admin-border)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-table-row-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <div className="grid h-7 w-7 place-items-center rounded-md" style={{ background: 'rgba(0, 191, 255, 0.12)', color: 'var(--admin-accent)' }}><Trophy size={13} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>Match Center</p>
                  <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Review scores & timelines</p>
                </div>
                <ArrowUpRight size={12} style={{ color: 'var(--admin-text-muted)' }} />
              </Link>
              <Link href="/admin/comments" className="flex items-center gap-2.5 rounded-md p-2.5 transition-colors" style={{ border: '1px solid var(--admin-border)' }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--admin-table-row-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                <div className="grid h-7 w-7 place-items-center rounded-md" style={{ background: 'rgba(255, 209, 102, 0.12)', color: 'var(--admin-warning)' }}><MessageSquare size={13} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>Moderate Comments</p>
                  <p className="text-xs" style={{ color: 'var(--admin-text-muted)' }}>Review community posts</p>
                </div>
                <ArrowUpRight size={12} style={{ color: 'var(--admin-text-muted)' }} />
              </Link>
            </div>
          </div>

          {/* Recent activity */}
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
              <h3 className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>Editorial Feed</h3>
              <Link href="/admin/articles" className="text-xs font-bold" style={{ color: 'var(--admin-accent)' }}>View all →</Link>
            </div>
            <div>
              {recentArticles.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs" style={{ color: 'var(--admin-text-muted)' }}>No recent activity</p>
              ) : recentArticles.slice(0, 5).map((a: any) => (
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

          {/* Community activity feed */}
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
              <div className="flex items-center gap-1.5">
                <MessageSquare size={13} style={{ color: 'var(--admin-accent)' }} />
                <h3 className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>Community Activity</h3>
              </div>
              <Link href="/admin/comments" className="text-xs font-bold" style={{ color: 'var(--admin-accent)' }}>View all →</Link>
            </div>
            <p className="px-4 py-6 text-center text-xs" style={{ color: 'var(--admin-text-muted)' }}>
              The backend does not provide an admin-wide comment feed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  sub,
  icon,
  badge,
  accentColor,
  accentBg,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ReactNode;
  badge?: string;
  accentColor: string;
  accentBg: string;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-lg p-3.5 transition-all duration-200"
      style={{
        border: '1px solid var(--admin-border)',
        background: 'var(--admin-card)',
      }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>
          {label}
        </span>
        <div
          className="grid h-6 w-6 place-items-center rounded-md"
          style={{ background: accentBg, color: accentColor }}
        >
          {icon}
        </div>
      </div>

      <div className="mt-2.5 flex items-baseline gap-2">
        <p className="text-xl font-extrabold tabular-nums tracking-tight sm:text-2xl" style={{ color: 'var(--admin-text)' }}>
          {value}
        </p>
        {badge && (
          <span
            className="rounded px-1.5 py-0.5 text-[10px] font-extrabold uppercase animate-pulse"
            style={{ background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)' }}
          >
            {badge}
          </span>
        )}
      </div>

      <p className="mt-1 text-[11px] truncate" style={{ color: 'var(--admin-text-muted)' }}>
        {sub}
      </p>
    </div>
  );
}

function TeamBadge({ code }: { code: string }) {
  if (!code) return null;
  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);
  return (
    <span
      className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white"
      style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 40) % 360}, 80%, 35%))` }}
    >
      {getInitials(code)}
    </span>
  );
}
