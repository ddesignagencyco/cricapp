'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import {
  FileText,
  Trophy,
  Users,
  UserCircle,
  Radio,
  CheckCircle2,
  Database,
  MessageSquare,
  CalendarClock,
  Heart,
  Share2,
  Flag,
  RefreshCw,
  Globe,
  Map,
} from 'lucide-react';
import { useAuth } from '../../../components/AuthProvider';
import { fetchMatchesPage } from '../../../services/matches';
import { fetchNewsAdmin } from '../../../services/newsAdmin';
import type { Match } from '../../../types';
import { AdminAvatar, LoadingState, StatusBadge } from '../../../components/admin/AdminShared';
import {
  fetchAdminAnalytics,
  fetchAdminUsers,
  fetchIngestionHealth,
  type AdminAnalytics,
  type AdminUser,
  type IngestionHealth,
} from '../../../services/admin';
import { getInitials } from '../../../utils/helpers';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const [matches, setMatches] = useState<Match[]>([]);
  const [upcoming, setUpcoming] = useState<Match[]>([]);
  const [latestUsers, setLatestUsers] = useState<AdminUser[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [health, setHealth] = useState<IngestionHealth | null>(null);
  const [recentArticles, setRecentArticles] = useState<any[]>([]);

  useEffect(() => {
    Promise.allSettled([
      fetchNewsAdmin({ limit: 6 }),
      fetchMatchesPage({ limit: 5, page: 1 }),
      fetchMatchesPage({ status: 'upcoming', limit: 5, page: 1 }),
      fetchAdminAnalytics(),
      fetchIngestionHealth(),
      fetchAdminUsers({ page: 1, limit: 5 }),
    ]).then(([newsRes, matchRes, upcomingRes, analyticsRes, healthRes, usersRes]) => {
      if (newsRes.status === 'fulfilled') {
        setRecentArticles(newsRes.value.items || []);
      }
      if (matchRes.status === 'fulfilled') {
        setMatches((matchRes.value.items || []).slice(0, 5));
      }
      if (upcomingRes.status === 'fulfilled') {
        setUpcoming((upcomingRes.value.items || []).slice(0, 5));
      }
      if (analyticsRes.status === 'fulfilled') {
        setAnalytics(analyticsRes.value);
      }
      if (healthRes.status === 'fulfilled') {
        setHealth(healthRes.value);
      }
      if (usersRes.status === 'fulfilled') {
        setLatestUsers((usersRes.value.items || []).slice(0, 5));
      }
      setLoading(false);
    });
  }, []);

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
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl" style={{ color: 'var(--admin-text)' }}>
            Welcome back, {userName.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
            Platform metrics, match feeds, and editorial activity.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/news/new"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold text-white"
            style={{ background: 'var(--admin-accent)' }}
          >
            <FileText size={13} /> Write Story
          </Link>
          <Link
            href="/admin/matches"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold"
            style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)', color: 'var(--admin-text)' }}
          >
            <Trophy size={13} style={{ color: 'var(--admin-accent)' }} /> Match Center
          </Link>
          <Link
            href="/admin/comments"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold"
            style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)', color: 'var(--admin-text)' }}
          >
            <MessageSquare size={13} style={{ color: 'var(--admin-warning)' }} /> Moderate
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <MetricCard
          label="Users"
          value={n(analytics?.users)}
          icon={<Users size={14} />}
          accentColor="var(--admin-success)"
          accentBg="var(--admin-success-bg)"
        />
        <MetricCard
          label="Matches"
          value={n(analytics?.matches)}
          icon={<Trophy size={14} />}
          accentColor="var(--admin-accent)"
          accentBg="var(--admin-info-bg)"
        />
        <MetricCard
          label="Teams"
          value={n(analytics?.teams)}
          icon={<Users size={14} />}
          accentColor="var(--admin-success)"
          accentBg="var(--admin-success-bg)"
        />
        <MetricCard
          label="Players"
          value={n(analytics?.players)}
          icon={<UserCircle size={14} />}
          accentColor="var(--admin-info)"
          accentBg="var(--admin-info-bg)"
        />
        <MetricCard
          label="Tournaments"
          value={n(analytics?.tournaments)}
          icon={<Globe size={14} />}
          accentColor="var(--admin-accent)"
          accentBg="var(--admin-info-bg)"
        />
        <MetricCard
          label="Tours"
          value={n(analytics?.tours)}
          icon={<Map size={14} />}
          accentColor="var(--admin-info)"
          accentBg="var(--admin-info-bg)"
        />
        <MetricCard
          label="Comments"
          value={n(analytics?.comments)}
          icon={<MessageSquare size={14} />}
          accentColor="var(--admin-accent)"
          accentBg="var(--admin-info-bg)"
        />
        <MetricCard
          label="Streams"
          value={n(analytics?.streams)}
          icon={<Radio size={14} />}
          accentColor="var(--admin-info)"
          accentBg="var(--admin-info-bg)"
        />
        <MetricCard
          label="Pending Reports"
          value={n(analytics?.pendingReports)}
          icon={<Flag size={14} />}
          accentColor="var(--admin-warning)"
          accentBg="var(--admin-warning-bg)"
        />
        <MetricCard
          label="Published Articles"
          value={n(analytics?.publishedArticles)}
          icon={<FileText size={14} />}
          accentColor="var(--admin-warning)"
          accentBg="var(--admin-warning-bg)"
        />
        <MetricCard
          label="Total Shares"
          value={n(analytics?.totalShares)}
          icon={<Share2 size={14} />}
          accentColor="var(--admin-accent)"
          accentBg="var(--admin-info-bg)"
        />
        <MetricCard
          label="Favorites"
          value={n(favoriteTotal(analytics))}
          icon={<Heart size={14} />}
          accentColor="var(--admin-danger)"
          accentBg="var(--admin-danger-bg)"
          extra={
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              <FavoriteTypeChip icon={<Users size={10} />} label="Teams" count={favoriteType(analytics, 'team')} />
              <FavoriteTypeChip icon={<UserCircle size={10} />} label="Players" count={favoriteType(analytics, 'player')} />
              <FavoriteTypeChip icon={<Trophy size={10} />} label="Matches" count={favoriteType(analytics, 'match')} />
            </div>
          }
        />
      </div>

      <div
        className="grid grid-cols-1 gap-3 rounded-lg p-4 sm:grid-cols-3 sm:divide-x"
        style={{
          border: '1px solid var(--admin-border)',
          background: 'var(--admin-card)',
        }}
      >
        <div className="flex items-center gap-3 sm:pr-4">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
            style={{
              background: health?.status === 'healthy' ? 'var(--admin-success-bg)' : 'var(--admin-warning-bg)',
              color: health?.status === 'healthy' ? 'var(--admin-success)' : 'var(--admin-warning)',
            }}
          >
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>Ingestion</p>
            <p className="text-xs" style={{ color: 'var(--admin-text-secondary)' }}>
              {health ? `${health.status}${health.heartbeatAgeMs !== null ? ` · ${Math.round(health.heartbeatAgeMs / 1000)}s ago` : ''}` : 'Unavailable'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:px-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: 'var(--admin-info-bg)', color: 'var(--admin-accent)' }}>
            <Database size={18} />
          </div>
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>Live matches</p>
            <p className="text-xs" style={{ color: 'var(--admin-text-secondary)' }}>{health?.liveMatchCount ?? 0} in Redis set</p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:pl-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: 'rgba(255, 209, 102, 0.12)', color: 'var(--admin-warning)' }}>
            <RefreshCw size={18} />
          </div>
          <div>
            <p className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>Sync keys</p>
            <p className="text-xs" style={{ color: 'var(--admin-text-secondary)' }}>{health?.syncKeyCount ?? 0} reference keys</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Main content */}
        <div className="space-y-5 lg:col-span-2">
          <MatchPreviewTable
            title="Recent Matches"
            icon={<Trophy size={14} />}
            empty="No matches yet"
            matches={matches}
            getTeamInfo={getTeamInfo}
          />

          <MatchPreviewTable
            title="Upcoming Fixtures"
            icon={<CalendarClock size={14} />}
            empty="No upcoming fixtures"
            matches={upcoming}
            getTeamInfo={getTeamInfo}
            hideScore
          />

          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span style={{ color: 'var(--admin-accent)' }}><Users size={14} /></span>
                <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text)' }}>Latest Users</h2>
              </div>
              <Link href="/admin/users" className="text-xs font-bold" style={{ color: 'var(--admin-accent)' }}>View all →</Link>
            </div>
            <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
              <table className="w-full text-left text-xs">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}>
                    <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>User</th>
                    <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Email</th>
                    <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-right" style={{ color: 'var(--admin-text-secondary)' }}>Role</th>
                  </tr>
                </thead>
                <tbody>
                  {latestUsers.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center" style={{ color: 'var(--admin-text-muted)' }}>No users yet</td>
                    </tr>
                  ) : latestUsers.map((u) => {
                    const name = u.displayName || u.username;
                    return (
                      <tr
                        key={u.id}
                        style={{ borderBottom: '1px solid var(--admin-border)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--admin-table-row-hover)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                      >
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2.5">
                            <AdminAvatar name={name} src={u.avatarUrl} size={24} />
                            <span className="font-semibold" style={{ color: 'var(--admin-text)' }}>{name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5" style={{ color: 'var(--admin-text-secondary)' }}>{u.email}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span
                            className="rounded-full px-2 py-0.5 text-[11px] font-bold"
                            style={{
                              background: u.isSuperAdmin || u.isAdmin ? 'var(--admin-accent)' : 'var(--admin-input-bg)',
                              color: u.isSuperAdmin || u.isAdmin ? '#fff' : 'var(--admin-text-secondary)',
                            }}
                          >
                            {u.isSuperAdmin ? 'Superadmin' : u.isAdmin ? 'Admin' : 'Member'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {/* Recent activity */}
          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--admin-border)' }}>
              <h3 className="text-xs font-bold" style={{ color: 'var(--admin-text)' }}>Editorial Feed</h3>
              <Link href="/admin/news" className="text-xs font-bold" style={{ color: 'var(--admin-accent)' }}>View all →</Link>
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
            {analytics ? (
              <div className="grid grid-cols-2 divide-x" style={{ borderColor: 'var(--admin-border)' }}>
                <div className="px-4 py-5">
                  <p className="text-2xl font-extrabold tabular-nums" style={{ color: 'var(--admin-text)' }}>{analytics.comments}</p>
                  <p className="mt-1 text-xs font-semibold" style={{ color: 'var(--admin-text-muted)' }}>Comments</p>
                </div>
                <div className="px-4 py-5">
                  <p className="text-2xl font-extrabold tabular-nums" style={{ color: analytics.pendingReports ? 'var(--admin-warning)' : 'var(--admin-text)' }}>{analytics.pendingReports}</p>
                  <p className="mt-1 text-xs font-semibold" style={{ color: 'var(--admin-text-muted)' }}>Reports</p>
                </div>
              </div>
            ) : (
              <p className="px-4 py-6 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>Analytics unavailable.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function MatchPreviewTable({
  title,
  icon,
  empty,
  matches,
  getTeamInfo,
  hideScore,
}: {
  title: string;
  icon: React.ReactNode;
  empty: string;
  matches: Match[];
  getTeamInfo: (m: Match) => { homeName: string; awayName: string };
  hideScore?: boolean;
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--admin-accent)' }}>{icon}</span>
          <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text)' }}>{title}</h2>
        </div>
        <Link href="/admin/matches" className="text-xs font-bold" style={{ color: 'var(--admin-accent)' }}>View all →</Link>
      </div>
      <div className="overflow-hidden rounded-lg" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}>
                <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Teams</th>
                {!hideScore && (
                  <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Score</th>
                )}
                <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Tournament</th>
                <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Date</th>
                <th className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-right" style={{ color: 'var(--admin-text-secondary)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {matches.length === 0 ? (
                <tr>
                  <td colSpan={hideScore ? 4 : 5} className="px-4 py-8 text-center" style={{ color: 'var(--admin-text-muted)' }}>{empty}</td>
                </tr>
              ) : matches.map((m) => {
                const t = getTeamInfo(m);
                const inn = m.currentInnings;
                return (
                  <tr
                    key={m.matchId || m.id}
                    style={{ borderBottom: '1px solid var(--admin-border)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--admin-table-row-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col gap-1.5 py-0.5">
                        <div className="flex items-center gap-2">
                          <TeamBadge code={t.homeName} />
                          <span className="text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>{t.homeName}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TeamBadge code={t.awayName} />
                          <span className="text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>{t.awayName}</span>
                        </div>
                      </div>
                    </td>
                    {!hideScore && (
                      <td className="px-4 py-2.5 font-mono font-bold" style={{ color: 'var(--admin-text)' }}>
                        {inn ? `${inn.runs}/${inn.wickets} (${inn.overs})` : '—'}
                      </td>
                    )}
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
      </div>
    </div>
  );
}

function n(value?: number) {
  return (value ?? 0).toLocaleString();
}

function favoriteTotal(analytics: AdminAnalytics | null) {
  const favorites = analytics?.favorites;
  if (!favorites) return 0;
  if (typeof favorites === 'number') return favorites;
  return favorites.total ?? 0;
}

function favoriteType(analytics: AdminAnalytics | null, type: string) {
  const favorites = analytics?.favorites;
  if (!favorites || typeof favorites === 'number') return 0;
  return favorites.types?.[type] ?? 0;
}

function FavoriteTypeChip({
  icon,
  label,
  count,
}: {
  icon: ReactNode;
  label: string;
  count: number;
}) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold"
      style={{ background: 'var(--admin-input-bg)', color: 'var(--admin-text-secondary)' }}
      title={label}
    >
      <span style={{ color: 'var(--admin-accent)' }}>{icon}</span>
      <span className="tabular-nums" style={{ color: 'var(--admin-text)' }}>{n(count)}</span>
    </span>
  );
}

function MetricCard({
  label,
  value,
  icon,
  accentColor,
  accentBg,
  extra,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  accentColor: string;
  accentBg: string;
  extra?: ReactNode;
}) {
  return (
    <div
      className="flex items-start gap-2.5 rounded-md px-3 py-2"
      style={{
        border: '1px solid var(--admin-border)',
        background: 'var(--admin-card)',
      }}
    >
      <div
        className="grid h-7 w-7 shrink-0 place-items-center rounded-md"
        style={{ background: accentBg, color: accentColor }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--admin-text-secondary)' }}>
          {label}
        </p>
        <p className="text-lg font-bold tabular-nums leading-tight" style={{ color: 'var(--admin-text)' }}>
          {value}
        </p>
        {extra}
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
    <span
      className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[9px] font-bold text-white"
      style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 70%, 50%), hsl(${(hue + 40) % 360}, 80%, 35%))` }}
    >
      {getInitials(code)}
    </span>
  );
}
