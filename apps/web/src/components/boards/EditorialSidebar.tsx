'use client';

import { useContext, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { QueryClient, QueryClientContext, QueryClientProvider, useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  Calculator,
  Calendar,
  Compass,
  Newspaper,
  Tag,
  TrendingUp,
  Trophy,
} from 'lucide-react';
import AdSlot from '../advertisements/AdSlot';
import TeamLogo from '../TeamLogo';
import NewsCopy from '../NewsCopy';
import { fetchLiveMatches, fetchMatches } from '../../services/matches';
import { fetchTournaments } from '../../services/tournaments';
import { fetchToursPage } from '../../services/tours';
import { fetchPslStandings, fetchPslLeaders } from '../../services/psl';
import { fetchNews } from '../../services/news';
import { newsHref } from '../../utils/newsConstraints';
import { formatPlayerName } from '../../utils/helpers';
import type { LeaderGroup, Match, NewsArticle, PointsRow, Tour, TournamentApi } from '../../types/index';

export type SidebarWidget = 'topics' | 'tools' | 'news' | 'gallery';
export type SidebarVariant =
  | 'home'
  | 'matches'
  | 'schedule'
  | 'news'
  | 'directory'
  | 'competitions'
  | 'predictions'
  | 'tools'
  | 'media';

interface EditorialSidebarProps {
  topPlacement: string;
  bottomPlacement?: string;
  variant?: SidebarVariant;
  /** @deprecated use variant instead */
  widget?: SidebarWidget;
  /** @deprecated kept for call-site compatibility */
  showNews?: boolean;
  /** @deprecated kept for call-site compatibility */
  showGallery?: boolean;
}

const STALE_5M = 5 * 60_000;

const NEWS_CATEGORY_TAGS = [
  { label: 'Pakistan Cricket', href: '/news?category=pakistan-cricket' },
  { label: 'PSL', href: '/news?category=psl' },
  { label: 'International', href: '/news?category=international' },
  { label: 'IPL', href: '/news?category=ipl' },
  { label: 'Match News', href: '/news?category=match-news' },
  { label: 'Analysis', href: '/news?category=analysis' },
  { label: 'Features', href: '/news?category=features' },
  { label: 'Records', href: '/news?category=records' },
  { label: 'Interviews', href: '/news?category=interviews' },
  { label: 'Urdu News', href: '/ur/news' },
];

const QUICK_TOOLS = [
  { slug: 'net-run-rate', title: 'Net Run Rate (NRR)', desc: 'Calculate tournament NRR scenarios' },
  { slug: 'required-run-rate', title: 'Required Run Rate', desc: 'Target & chase rate calculator' },
  { slug: 'dls-calculator', title: 'DLS Target Calculator', desc: 'Rain-affected par score estimator' },
  { slug: 'player-comparison', title: 'Player Comparison', desc: 'Compare head-to-head career stats' },
];

const COMPARE_TOOLS = [
  { slug: 'player-comparison', title: 'Player Comparison', desc: 'Side-by-side career stats & form' },
  { slug: 'head-to-head', title: 'Head-to-Head Analyzer', desc: 'Team rivalry & historical records' },
  { slug: 'batting-average', title: 'Batting Average', desc: 'Runs per dismissal calculator' },
  { slug: 'bowling-economy', title: 'Bowling Economy', desc: 'Runs conceded per over' },
];

const ODDS_TOOLS = [
  { slug: 'odds-converter', title: 'Odds Converter', desc: 'Decimal, fractional & American prices' },
  { slug: 'bookmaker-margin', title: 'Bookmaker Margin', desc: 'Check overround & implied probability' },
  { slug: 'dls-calculator', title: 'DLS Target Calculator', desc: 'Rain-affected par score estimator' },
  { slug: 'net-run-rate', title: 'Net Run Rate (NRR)', desc: 'Tournament qualification math' },
];

const EXPLORE_LINKS = [
  { label: 'Live Cricket Scores', href: '/matches?tab=live' },
  { label: 'PSL 2026 Points Table & Stats', href: '/psl' },
  { label: 'Upcoming Match Schedule', href: '/schedules' },
  { label: 'AI Match Predictions', href: '/predictions' },
  { label: 'Cricket Photo Gallery', href: '/gallery' },
];

function TrendingTopicsCard() {
  return (
    <section className="rounded-xl border border-lborder bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mtext">
          <Tag size={13} className="text-accent" aria-hidden />
          Trending Topics
        </h3>
        <Link href="/news" className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-accent hover:underline">
          All news <ArrowRight size={11} />
        </Link>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {NEWS_CATEGORY_TAGS.map((tag) => (
          <Link
            key={tag.href}
            href={tag.href}
            className="rounded-full border border-lborder bg-secondary/40 px-2.5 py-1 text-xs font-medium text-mtext transition-colors hover:border-accent/50 hover:bg-accent/10 hover:text-accent"
          >
            {tag.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function ToolsCard({
  title = 'Cricket Tools',
  items = QUICK_TOOLS,
}: {
  title?: string;
  items?: typeof QUICK_TOOLS;
}) {
  return (
    <section className="rounded-xl border border-lborder bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mtext">
          <Calculator size={13} className="text-accent" aria-hidden />
          {title}
        </h3>
        <Link href="/tools" className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-accent hover:underline">
          All tools <ArrowRight size={11} />
        </Link>
      </div>
      <div className="space-y-2">
        {items.map((tool) => (
          <Link
            key={tool.slug}
            href={`/tools/${tool.slug}`}
            className="group block rounded-lg border border-lborder/60 bg-secondary/30 px-3 py-2 transition-colors hover:border-accent/40 hover:bg-secondary/60"
          >
            <p className="text-xs font-semibold text-mtext group-hover:text-accent">{tool.title}</p>
            <p className="mt-0.5 text-[11px] text-stext">{tool.desc}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

function ExploreCard() {
  return (
    <section className="rounded-xl border border-lborder bg-card p-4 shadow-sm">
      <h3 className="mb-2.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mtext">
        <Compass size={13} className="text-accent" aria-hidden />
        Explore CriczApp
      </h3>
      <ul className="divide-y divide-lborder/50">
        {EXPLORE_LINKS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="group flex items-center justify-between py-2 text-xs font-medium text-stext transition-colors hover:text-accent"
            >
              <span>{item.label}</span>
              <ArrowRight size={12} className="opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:opacity-100" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MiniMatchesCard() {
  const { data: matches = [] } = useQuery<Match[]>({
    queryKey: ['sidebar', 'mini-matches'],
    staleTime: STALE_5M,
    queryFn: async () => {
      const [live, upcoming] = await Promise.all([
        fetchLiveMatches().catch(() => []),
        fetchMatches({ status: 'upcoming', limit: 4 }).catch(() => []),
      ]);
      const combined = [...(live || []), ...(upcoming || [])];
      const seen = new Set<string>();
      const out: Match[] = [];
      for (const m of combined) {
        const id = String(m.matchId || m.id || '');
        if (!id || seen.has(id)) continue;
        seen.add(id);
        out.push(m);
        if (out.length >= 4) break;
      }
      return out;
    },
  });

  if (!matches.length) return <ExploreCard />;

  return (
    <section className="rounded-xl border border-lborder bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mtext">
          <Calendar size={13} className="text-accent" aria-hidden />
          Matches & Scores
        </h3>
        <Link href="/matches" className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-accent hover:underline">
          All <ArrowRight size={11} />
        </Link>
      </div>
      <div className="divide-y divide-lborder/60">
        {matches.map((m) => {
          const id = String(m.matchId || m.id || '');
          const home = m.teams?.home;
          const away = m.teams?.away;
          const isLive = m.status === 'live';
          return (
            <Link
              key={id}
              href={`/matches/${encodeURIComponent(id)}`}
              className="group block py-2.5 first:pt-0 last:pb-0"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-stext">
                  {m.tournament || 'Cricket'}
                </span>
                {isLive ? (
                  <span className="shrink-0 rounded bg-danger/15 px-1.5 py-0.5 text-[9px] font-bold uppercase text-danger">
                    Live
                  </span>
                ) : (
                  <span className="shrink-0 text-[10px] font-medium text-stext">Upcoming</span>
                )}
              </div>
              <div className="space-y-1 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 font-semibold text-mtext group-hover:text-accent">
                    <TeamLogo code={home?.code} name={home?.name} size="xs" link={false} />
                    <span className="truncate">{home?.name || home?.code || 'TBA'}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px] font-bold tabular-nums text-mtext">
                    {home?.score || '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex min-w-0 items-center gap-1.5 font-semibold text-mtext group-hover:text-accent">
                    <TeamLogo code={away?.code} name={away?.name} size="xs" link={false} />
                    <span className="truncate">{away?.name || away?.code || 'TBA'}</span>
                  </span>
                  <span className="shrink-0 font-mono text-[11px] font-bold tabular-nums text-mtext">
                    {away?.score || '—'}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function ActiveSeriesCard() {
  const { data: tournaments = [] } = useQuery<TournamentApi[]>({
    queryKey: ['sidebar', 'active-tournaments', 'latest'],
    staleTime: STALE_5M,
    queryFn: () => fetchTournaments({ limit: 5, sortBy: 'latest', status: 'active' }).catch(() => []),
  });

  if (!tournaments.length) return <TrendingTopicsCard />;

  return (
    <section className="rounded-xl border border-lborder bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mtext">
          <Trophy size={13} className="text-accent" aria-hidden />
          Active Series
        </h3>
        <Link href="/tournaments" className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-accent hover:underline">
          All <ArrowRight size={11} />
        </Link>
      </div>
      <ul className="divide-y divide-lborder/50">
        {tournaments.slice(0, 5).map((t) => (
          <li key={t.id}>
            <Link
              href={`/tournaments/${encodeURIComponent(t.id)}`}
              className="group flex items-center justify-between gap-2 py-2 text-xs font-medium text-mtext transition-colors hover:text-accent"
            >
              <span className="truncate">{t.name}</span>
              <ArrowRight size={12} className="shrink-0 text-stext opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ActiveToursCard() {
  const { data: tours = [] } = useQuery<Tour[]>({
    queryKey: ['sidebar', 'popular-tours'],
    staleTime: STALE_5M,
    queryFn: async () => {
      const res = await fetchToursPage({ limit: 5, sortBy: 'tournaments', sortOrder: 'desc' }).catch(() => null);
      return res?.items ?? [];
    },
  });

  if (!tours.length) return <ExploreCard />;

  return (
    <section className="rounded-xl border border-lborder bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mtext">
          <Compass size={13} className="text-accent" aria-hidden />
          Cricket Tours
        </h3>
        <Link href="/tours" className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-accent hover:underline">
          All <ArrowRight size={11} />
        </Link>
      </div>
      <ul className="divide-y divide-lborder/50">
        {tours.slice(0, 5).map((t) => (
          <li key={t.id}>
            <Link
              href={`/tournaments?country=${encodeURIComponent(t.name)}`}
              className="group flex items-center justify-between gap-2 py-2 text-xs font-medium text-mtext transition-colors hover:text-accent"
            >
              <span className="truncate">{t.name}</span>
              <ArrowRight size={12} className="shrink-0 text-stext opacity-60 transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function TopHeadlinesCard() {
  const { data: articles = [] } = useQuery<NewsArticle[]>({
    queryKey: ['sidebar', 'top-headlines-en'],
    staleTime: STALE_5M,
    queryFn: () => fetchNews({ language: 'en', limit: 4 }).catch(() => []),
  });

  if (!articles.length) return <ExploreCard />;

  return (
    <section className="rounded-xl border border-lborder bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mtext">
          <Newspaper size={13} className="text-accent" aria-hidden />
          Top Headlines
        </h3>
        <Link href="/news" className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-accent hover:underline">
          All <ArrowRight size={11} />
        </Link>
      </div>
      <ul className="divide-y divide-lborder/50">
        {articles.slice(0, 4).map((item) => (
          <li key={item.id}>
            <Link href={newsHref(item)} className="group block py-2 first:pt-0 last:pb-0">
              <p className="line-clamp-2 text-xs font-semibold leading-snug text-mtext group-hover:text-accent">
                {item.title}
              </p>
              {item.date ? <p className="mt-1 text-[10px] text-stext">{item.date}</p> : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MiniPslStandingsCard() {
  const { data: rows = [] } = useQuery<PointsRow[]>({
    queryKey: ['sidebar', 'psl-standings'],
    staleTime: STALE_5M,
    queryFn: async () => {
      const list = await fetchPslStandings().catch(() => []);
      return [...(list || [])].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999)).slice(0, 4);
    },
  });

  if (!rows.length) return <ExploreCard />;

  return (
    <section className="rounded-xl border border-lborder bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mtext">
          <TrendingUp size={13} className="text-accent" aria-hidden />
          PSL Standings
        </h3>
        <Link href="/psl" className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-accent hover:underline">
          Full table <ArrowRight size={11} />
        </Link>
      </div>
      <table className="w-full text-left text-xs">
        <thead>
          <tr className="border-b border-lborder text-[10px] uppercase text-stext">
            <th className="py-1.5 pr-2">Team</th>
            <th className="w-7 py-1.5 text-center">P</th>
            <th className="w-7 py-1.5 text-center">W</th>
            <th className="w-9 py-1.5 text-right">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-lborder/50">
          {rows.map((r) => (
            <tr key={r.teamId}>
              <td className="py-2 pr-2">
                <Link href={`/teams/${r.teamId}`} className="flex items-center gap-1.5 font-semibold text-mtext hover:text-accent">
                  <TeamLogo teamId={r.teamId} code={r.teamAbbr} name={r.teamName} size="xs" link={false} />
                  <span className="truncate max-w-[125px]">{r.teamName}</span>
                </Link>
              </td>
              <td className="py-2 text-center font-mono text-stext">{r.played}</td>
              <td className="py-2 text-center font-mono text-accent">{r.won}</td>
              <td className="py-2 text-right font-mono font-bold text-mtext">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function MiniTopPerformersCard() {
  const { data: leaders = [] } = useQuery<LeaderGroup[]>({
    queryKey: ['sidebar', 'psl-leaders'],
    staleTime: STALE_5M,
    queryFn: () => fetchPslLeaders().catch(() => []),
  });

  const runs = leaders.find((g) => g.stat === 'top_runs')?.entries?.slice(0, 3) || [];
  const wickets = leaders.find((g) => g.stat === 'top_wickets')?.entries?.slice(0, 3) || [];

  if (!runs.length && !wickets.length) return <TrendingTopicsCard />;

  return (
    <section className="rounded-xl border border-lborder bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mtext">
          <TrendingUp size={13} className="text-accent" aria-hidden />
          PSL Leaders
        </h3>
        <Link href="/psl#stats" className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-accent hover:underline">
          All stats <ArrowRight size={11} />
        </Link>
      </div>
      <div className="space-y-3 text-xs">
        {runs.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-stext">Most Runs</p>
            <div className="divide-y divide-lborder/50">
              {runs.map((e, idx) => (
                <div key={e.playerId || idx} className="flex items-center justify-between gap-2 py-1.5">
                  <Link href={`/players/${e.playerId}`} className="truncate font-semibold text-mtext hover:text-accent">
                    {formatPlayerName(e.playerName)}
                  </Link>
                  <span className="shrink-0 font-mono font-bold text-mtext">{e.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        {wickets.length > 0 && (
          <div>
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-stext">Most Wickets</p>
            <div className="divide-y divide-lborder/50">
              {wickets.map((e, idx) => (
                <div key={e.playerId || idx} className="flex items-center justify-between gap-2 py-1.5">
                  <Link href={`/players/${e.playerId}`} className="truncate font-semibold text-mtext hover:text-accent">
                    {formatPlayerName(e.playerName)}
                  </Link>
                  <span className="shrink-0 font-mono font-bold text-mtext">{e.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function UrduNewsCard() {
  const { data: articles = [] } = useQuery<NewsArticle[]>({
    queryKey: ['sidebar', 'urdu-news'],
    staleTime: STALE_5M,
    queryFn: () => fetchNews({ language: 'ur', limit: 4 }).catch(() => []),
  });

  if (!articles.length) return <TrendingTopicsCard />;

  return (
    <section className="rounded-xl border border-lborder bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-mtext">
          <Newspaper size={13} className="text-accent" aria-hidden />
          Urdu News · اردو خبریں
        </h3>
        <Link href="/ur/news" className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-accent hover:underline">
          All <ArrowRight size={11} />
        </Link>
      </div>
      <ul className="divide-y divide-lborder/50">
        {articles.slice(0, 4).map((item) => (
          <li key={item.id}>
            <Link href={newsHref(item)} className="group block py-2 first:pt-0 last:pb-0">
              <NewsCopy
                as="p"
                language="ur"
                text={item.title}
                className="line-clamp-2 text-xs font-semibold leading-relaxed text-mtext group-hover:text-accent"
              >
                {item.title}
              </NewsCopy>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SidebarDataBoundary({ children }: { children: ReactNode }) {
  const existing = useContext(QueryClientContext);
  const [fallback] = useState(() =>
    existing ? null : new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  );
  if (existing || !fallback) return <>{children}</>;
  return <QueryClientProvider client={fallback}>{children}</QueryClientProvider>;
}

export default function EditorialSidebar(props: EditorialSidebarProps) {
  return (
    <SidebarDataBoundary>
      <EditorialSidebarInner {...props} />
    </SidebarDataBoundary>
  );
}

function EditorialSidebarInner({
  topPlacement,
  bottomPlacement,
  variant,
  widget,
}: EditorialSidebarProps) {
  const resolvedVariant: SidebarVariant =
    variant ?? (widget === 'tools' ? 'predictions' : 'tools');

  return (
    <aside className="hidden lg:sticky lg:top-20 lg:flex lg:flex-col lg:gap-6">
      <div className="flex justify-center empty:hidden">
        <AdSlot placement={topPlacement} />
      </div>

      {resolvedVariant === 'home' ? (
        <>
          <UrduNewsCard />
          <ToolsCard title="Quick Cricket Tools" items={QUICK_TOOLS} />
        </>
      ) : resolvedVariant === 'matches' ? (
        <>
          <ActiveSeriesCard />
          <MiniPslStandingsCard />
        </>
      ) : resolvedVariant === 'schedule' ? (
        <>
          <ActiveToursCard />
          <ToolsCard title="Match Calculators" items={QUICK_TOOLS} />
        </>
      ) : resolvedVariant === 'news' ? (
        <>
          <TrendingTopicsCard />
          <MiniMatchesCard />
        </>
      ) : resolvedVariant === 'directory' ? (
        <>
          <MiniTopPerformersCard />
          <ToolsCard title="Compare & Stats Tools" items={COMPARE_TOOLS} />
        </>
      ) : resolvedVariant === 'competitions' ? (
        <>
          <MiniMatchesCard />
          <MiniPslStandingsCard />
        </>
      ) : resolvedVariant === 'predictions' ? (
        <>
          <ToolsCard title="Odds & Calculators" items={ODDS_TOOLS} />
          <ActiveSeriesCard />
        </>
      ) : resolvedVariant === 'media' ? (
        <>
          <TopHeadlinesCard />
          <TrendingTopicsCard />
        </>
      ) : (
        <>
          <TrendingTopicsCard />
          <ExploreCard />
        </>
      )}

      {bottomPlacement ? (
        <div className="flex justify-center empty:hidden">
          <AdSlot placement={bottomPlacement} />
        </div>
      ) : null}
    </aside>
  );
}
