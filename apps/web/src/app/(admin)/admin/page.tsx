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
  Newspaper,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../../components/AuthProvider';
import { fetchMatchesPage } from '../../../services/matches';
import { fetchNewsAdmin } from '../../../services/newsAdmin';
import type { Match } from '../../../types';
import { AdminAvatar, AdminEntityLink, LoadingState, StatusBadge } from '../../../components/admin/AdminShared';
import Badge from '../../../components/Badge';
import {
  fetchAdminAnalytics,
  fetchAdminUsers,
  fetchIngestionHealth,
  type AdminAnalytics,
  type AdminUser,
  type IngestionHealth,
} from '../../../services/admin';
import { asPercent, stageLabel } from '../../../lib/predictions';
import { fetchAdminPredictionModels, fetchAdminPredictionRuns } from '../../../services/predictions';
import type { AdminPredictionModelVersion, PredictionRun } from '../../../types/predictions';
import { getInitials } from '../../../utils/helpers';
import { compactMatchScore } from '../../../lib/matchScoreboard';
import EntityAvatar from '../../../components/EntityAvatar';
import NewsCopy from '../../../components/NewsCopy';

function userRank(user: AdminUser): number {
  if (user.isSuperAdmin) return 0;
  if (user.isAdmin) return 1;
  return 2;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  const [matches, setMatches] = useState<Match[]>([]);
  const [upcoming, setUpcoming] = useState<Match[]>([]);
  const [latestUsers, setLatestUsers] = useState<AdminUser[]>([]);
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);
  const [health, setHealth] = useState<IngestionHealth | null>(null);
  const [recentArticles, setRecentArticles] = useState<any[]>([]);
  const [predictionModels, setPredictionModels] = useState<AdminPredictionModelVersion[]>([]);
  const [predictionRuns, setPredictionRuns] = useState<PredictionRun[]>([]);

  useEffect(() => {
    Promise.allSettled([
      fetchNewsAdmin({ limit: 6 }),
      fetchMatchesPage({ limit: 5, page: 1 }),
      fetchMatchesPage({ status: 'upcoming', limit: 5, page: 1 }),
      fetchAdminAnalytics(),
      fetchIngestionHealth(),
      fetchAdminUsers({ page: 1, limit: 40 }),
      fetchAdminPredictionModels(),
      fetchAdminPredictionRuns({ page: 1, limit: 5 }),
    ]).then(([newsRes, matchRes, upcomingRes, analyticsRes, healthRes, usersRes, modelsRes, runsRes]) => {
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
        const ranked = [...(usersRes.value.items || [])].sort((a, b) => {
          const rank = userRank(a) - userRank(b);
          if (rank !== 0) return rank;
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        });
        setLatestUsers(ranked.slice(0, 6));
      }
      if (modelsRes.status === 'fulfilled') {
        setPredictionModels(modelsRes.value || []);
      }
      if (runsRes.status === 'fulfilled') {
        setPredictionRuns(runsRes.value.items || []);
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
  if (loading) return <LoadingState variant="dashboard" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: 'var(--admin-text)' }}>
            Welcome back, {userName.split(' ')[0]}
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
            Platform metrics, match feeds, and editorial activity.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/news/new"
            className="btn-brand inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold"
          >
            <FileText size={13} /> Write Story
          </Link>
          <Link
            href="/admin/matches"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold"
            style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)', color: 'var(--admin-text)' }}
          >
            <Trophy size={13} style={{ color: 'var(--admin-accent)' }} /> Match Center
          </Link>
          <Link
            href="/admin/comments"
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold"
            style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)', color: 'var(--admin-text)' }}
          >
            <MessageSquare size={13} style={{ color: 'var(--admin-warning)' }} /> Moderate
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 items-start gap-2 sm:grid-cols-3 xl:grid-cols-6">
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
          label="Published News"
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
      </div>

      <FavoritesCard analytics={analytics} />

      <div
        className="grid grid-cols-1 gap-3 divide-y rounded-lg p-4 sm:grid-cols-3 sm:divide-x sm:divide-y-0"
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
            <p className="text-[13px] font-semibold" style={{ color: 'var(--admin-text)' }}>Ingestion</p>
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
            <p className="text-[13px] font-semibold" style={{ color: 'var(--admin-text)' }}>Live matches</p>
            <p className="text-xs" style={{ color: 'var(--admin-text-secondary)' }}>{health?.liveMatchCount ?? 0} in Redis set</p>
          </div>
        </div>
        <div className="flex items-center gap-3 sm:pl-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg" style={{ background: 'var(--admin-warning-bg)', color: 'var(--admin-warning)' }}>
            <RefreshCw size={18} />
          </div>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: 'var(--admin-text)' }}>Sync keys</p>
            <p className="text-xs" style={{ color: 'var(--admin-text-secondary)' }}>{health?.syncKeyCount ?? 0} reference keys</p>
          </div>
        </div>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span style={{ color: 'var(--admin-accent)' }}><Sparkles size={14} /></span>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Prediction models</h2>
          </div>
          <Link href="/admin/predictions" className="text-xs font-semibold" style={{ color: 'var(--admin-accent)' }}>View all →</Link>
        </div>
        {predictionModels.length === 0 ? (
          <p
            className="rounded-lg px-4 py-6 text-center text-xs"
            style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)', color: 'var(--admin-text-muted)' }}
          >
            No stored model versions yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {predictionModels.slice(0, 4).map((model) => (
              <div
                key={`${model.modelVersion}-${model.stage}`}
                className="rounded-lg p-4"
                style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-mono text-sm font-bold" style={{ color: 'var(--admin-text)' }}>{model.modelVersion}</p>
                  {model.isCurrent && <StatusBadge status="active" />}
                </div>
                <p className="mt-2 text-xs" style={{ color: 'var(--admin-text-secondary)' }}>
                  {stageLabel(model.stage)} · {model.runCount.toLocaleString()} runs
                </p>
                <p className="mt-1 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  Last {model.lastRunAt ? new Date(model.lastRunAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
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
      </div>

      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
        <SectionCard title="Editorial Feed" icon={<FileText size={14} />} href="/admin/news">
          {recentArticles.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs" style={{ color: 'var(--admin-text-muted)' }}>No recent activity</p>
          ) : recentArticles.slice(0, 5).map((a: any) => (
            <div
              key={a.id}
              className="flex items-start gap-2.5 px-4 py-2.5"
              style={{ borderBottom: '1px solid var(--admin-border)' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--admin-table-row-hover)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              <div className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded text-[10px] font-bold" style={{ background: 'var(--admin-success-bg)', color: 'var(--admin-success)' }}>
                <FileText size={11} />
              </div>
              <div className="min-w-0 flex-1">
                <NewsCopy as="p" language={a.language} text={a.title} className="line-clamp-2 text-[13px] font-semibold" style={{ color: 'var(--admin-text)' }}>{a.title}</NewsCopy>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
                  {a.isPublished ? 'Published' : 'Draft'} · {new Date(a.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
              </div>
            </div>
          ))}
        </SectionCard>
        <SectionCard title="Community Activity" icon={<MessageSquare size={14} />} href="/admin/comments">
          {analytics ? (
            <div className="grid h-full grid-cols-2 divide-x" style={{ borderColor: 'var(--admin-border)' }}>
              <div className="px-4 py-5">
                <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--admin-text)' }}>{analytics.comments}</p>
                <p className="mt-1 text-xs font-semibold" style={{ color: 'var(--admin-text-muted)' }}>Comments</p>
              </div>
              <div className="px-4 py-5">
                <p className="text-xl font-bold tabular-nums" style={{ color: analytics.pendingReports ? 'var(--admin-warning)' : 'var(--admin-text)' }}>{analytics.pendingReports}</p>
                <p className="mt-1 text-xs font-semibold" style={{ color: 'var(--admin-text-muted)' }}>Reports</p>
              </div>
            </div>
          ) : (
            <p className="px-4 py-6 text-center text-sm" style={{ color: 'var(--admin-text-muted)' }}>Analytics unavailable.</p>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-2">
        <SectionCard title="Recent prediction runs" icon={<Sparkles size={14} />} href="/admin/predictions">
          <div className="table-scroll">
            <table className="w-full text-left text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Match</th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Stage</th>
                  <th className="hidden px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider sm:table-cell" style={{ color: 'var(--admin-text-secondary)' }}>Home / Away</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>When</th>
                </tr>
              </thead>
              <tbody>
                {predictionRuns.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center" style={{ color: 'var(--admin-text-muted)' }}>No prediction runs yet</td>
                  </tr>
                ) : predictionRuns.map((run) => {
                  const matchId = String((run as PredictionRun & { matchId?: string }).matchId || '');
                  return (
                    <tr
                      key={run.runId}
                      style={{ borderBottom: '1px solid var(--admin-border)' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--admin-table-row-hover)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                    >
                      <td className="px-4 py-2.5 font-mono text-[12px]" style={{ color: 'var(--admin-text)' }}>
                        {matchId ? (
                          <AdminEntityLink href={`/predictions/${matchId}`}>{matchId.replace(/^sr:match:/, '')}</AdminEntityLink>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--admin-text-secondary)' }}>{stageLabel(run.stage)}</td>
                      <td className="hidden px-4 py-2.5 font-mono font-bold sm:table-cell" style={{ color: 'var(--admin-text)' }}>
                        {asPercent(run.homeWinProb)} / {asPercent(run.awayWinProb)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono" style={{ color: 'var(--admin-text-muted)' }}>
                        {run.createdAt ? new Date(run.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
        <SectionCard title="Latest Users" icon={<Users size={14} />} href="/admin/users">
          <div className="table-scroll">
            <table className="w-full text-left text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>User</th>
                  <th className="hidden px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider sm:table-cell" style={{ color: 'var(--admin-text-secondary)' }}>Email</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Role</th>
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
                          <span className="text-[13px] font-semibold" style={{ color: 'var(--admin-text)' }}>{name}</span>
                        </div>
                      </td>
                      <td className="hidden px-4 py-2.5 sm:table-cell" style={{ color: 'var(--admin-text-secondary)' }}>{u.email}</td>
                      <td className="px-4 py-2.5 text-right">
                        <Badge tone={u.isSuperAdmin || u.isAdmin ? 'primary' : 'neutral'}>
                          {u.isSuperAdmin ? 'Superadmin' : u.isAdmin ? 'Admin' : 'Member'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  icon,
  href,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-lg"
      style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
    >
      <div
        className="flex h-11 shrink-0 items-center justify-between px-4"
        style={{ borderBottom: '1px solid var(--admin-border)' }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--admin-accent)' }}>{icon}</span>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>{title}</h2>
        </div>
        <Link href={href} className="text-xs font-semibold" style={{ color: 'var(--admin-accent)' }}>View all →</Link>
      </div>
      <div className="min-h-0 flex-1">{children}</div>
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
  getTeamInfo: (_m: Match) => { homeName: string; awayName: string };
  hideScore?: boolean;
}) {
  return (
    <SectionCard title={title} icon={icon} href="/admin/matches">
        <div className="table-scroll">
          <table className="w-full text-left text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)', background: 'var(--admin-table-header)' }}>
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Teams</th>
                {!hideScore && (
                  <th className="hidden px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider sm:table-cell" style={{ color: 'var(--admin-text-secondary)' }}>Score</th>
                )}
                <th className="hidden px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider md:table-cell" style={{ color: 'var(--admin-text-secondary)' }}>Tournament</th>
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>Date</th>
                <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-right" style={{ color: 'var(--admin-text-secondary)' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {matches.length === 0 ? (
                <tr>
                  <td colSpan={hideScore ? 4 : 5} className="px-4 py-8 text-center" style={{ color: 'var(--admin-text-muted)' }}>{empty}</td>
                </tr>
              ) : matches.map((m) => {
                const t = getTeamInfo(m);
                return (
                  <tr
                    key={m.matchId || m.id}
                    style={{ borderBottom: '1px solid var(--admin-border)' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--admin-table-row-hover)'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td className="px-4 py-2.5" style={{ color: 'var(--admin-text)' }}>
                      {m.matchId || m.id ? (
                        <AdminEntityLink href={`/matches/${m.matchId || m.id}`}>
                          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="flex min-w-0 items-center gap-1.5">
                              <TeamBadge code={t.homeName} />
                              <span className="max-w-[9rem] truncate text-[13px] font-semibold sm:max-w-none">{t.homeName}</span>
                            </span>
                            <span className="text-[11px] font-semibold" style={{ color: 'var(--admin-text-muted)' }}>vs</span>
                            <span className="flex min-w-0 items-center gap-1.5">
                              <TeamBadge code={t.awayName} />
                              <span className="max-w-[9rem] truncate text-[13px] font-semibold sm:max-w-none">{t.awayName}</span>
                            </span>
                          </div>
                        </AdminEntityLink>
                      ) : (
                        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <TeamBadge code={t.homeName} />
                            <span className="max-w-[9rem] truncate text-[13px] font-semibold sm:max-w-none" style={{ color: 'var(--admin-text)' }}>{t.homeName}</span>
                          </span>
                          <span className="text-[11px] font-semibold" style={{ color: 'var(--admin-text-muted)' }}>vs</span>
                          <span className="flex min-w-0 items-center gap-1.5">
                            <TeamBadge code={t.awayName} />
                            <span className="max-w-[9rem] truncate text-[13px] font-semibold sm:max-w-none" style={{ color: 'var(--admin-text)' }}>{t.awayName}</span>
                          </span>
                        </div>
                      )}
                    </td>
                    {!hideScore && (
                      <td className="hidden px-4 py-2.5 font-mono font-bold sm:table-cell" style={{ color: 'var(--admin-text)' }}>
                        {compactMatchScore(m)}
                      </td>
                    )}
                    <td className="hidden px-4 py-2.5 md:table-cell" style={{ color: 'var(--admin-text-secondary)' }}>
                      <span className="line-clamp-2 max-w-[14rem]">
                        {m.tournamentId ? (
                          <AdminEntityLink href={`/tournaments/${m.tournamentId}`}>{m.tournament || 'Tournament'}</AdminEntityLink>
                        ) : (
                          m.tournament || '—'
                        )}
                      </span>
                    </td>
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
    </SectionCard>
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

function FavoritesCard({ analytics }: { analytics: AdminAnalytics | null }) {
  const types = [
    { key: 'team', label: 'Teams', icon: Users, count: favoriteType(analytics, 'team') },
    { key: 'player', label: 'Players', icon: UserCircle, count: favoriteType(analytics, 'player') },
    { key: 'match', label: 'Matches', icon: Trophy, count: favoriteType(analytics, 'match') },
    { key: 'news', label: 'News', icon: Newspaper, count: favoriteType(analytics, 'news') },
  ];

  return (
    <section
      className="overflow-hidden rounded-lg"
      style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
    >
      <div
        className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid var(--admin-border)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg"
            style={{ background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)' }}
          >
            <Heart size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>Favorites</p>
            <p className="text-xs" style={{ color: 'var(--admin-text-secondary)' }}>
              Saved teams, players, matches, and news
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <p className="text-2xl font-bold tabular-nums leading-none" style={{ color: 'var(--admin-text)' }}>
            {n(favoriteTotal(analytics))}
          </p>
          <Link href="/favorites" className="text-xs font-semibold" style={{ color: 'var(--admin-accent)' }}>
            View all →
          </Link>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-px sm:grid-cols-4" style={{ background: 'var(--admin-border)' }}>
        {types.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.key} className="flex items-center gap-3 px-4 py-3.5" style={{ background: 'var(--admin-card)' }}>
              <div
                className="grid h-8 w-8 shrink-0 place-items-center rounded-md"
                style={{ background: 'var(--admin-danger-bg)', color: 'var(--admin-danger)' }}
              >
                <Icon size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold tabular-nums leading-tight" style={{ color: 'var(--admin-text)' }}>
                  {n(item.count)}
                </p>
                <p className="truncate text-xs" style={{ color: 'var(--admin-text-secondary)' }}>{item.label}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  icon,
  accentColor,
  accentBg,
}: {
  label: string;
  value: string | number;
  icon: ReactNode;
  accentColor: string;
  accentBg: string;
}) {
  return (
    <div
      className="flex min-w-0 items-center gap-3 rounded-lg px-3 py-2.5"
      style={{
        border: '1px solid var(--admin-border)',
        background: 'var(--admin-card)',
      }}
    >
      <div
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md"
        style={{ background: accentBg, color: accentColor }}
      >
        {icon}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[11px] font-medium capitalize" style={{ color: 'var(--admin-text-secondary)' }}>
          {label}
        </p>
        <p className="text-lg font-bold tabular-nums leading-tight" style={{ color: 'var(--admin-text)' }}>
          {value}
        </p>
      </div>
    </div>
  );
}

function TeamBadge({ code }: { code: string }) {
  if (!code) return null;
  return (
    <EntityAvatar className="h-6 w-6 text-[10px] font-bold">{getInitials(code)}</EntityAvatar>
  );
}
