import Link from 'next/link';
import dynamic from 'next/dynamic';
import MatchCard from '../../components/MatchCard';
// Above-fold islands that hydrate independently: SSR HTML is unchanged, but
// their JS (socket client, Intl/scoreboard work, observers) loads and hydrates
// after the critical path instead of competing with the LCP hero paint.
const MatchTickerBar = dynamic(() => import('../../components/MatchTickerBar'));
const LiveNowSection = dynamic(() => import('../../components/LiveNowSection'));
import SectionHeader from '../../components/SectionHeader';
import WatchNowSection from '../../components/WatchNowSection';
import CricketHero from '../../components/CricketHero';
import PointsTable from '../../components/PointsTable';
import HomePredictions, { type HomePredictionPick } from '../../components/predictions/HomePredictions';
import RecentResultCard from '../../components/RecentResultCard';
// Client-fetched below-fold strip: renders null until its query resolves, so
// splitting it into its own chunk changes no content, only when its JS loads.
const HomeGalleryStrip = dynamic(() => import('../../components/gallery/HomeGalleryStrip'));
// Same treatment as the gallery strip: a client-fetched, below-fold rail that
// renders nothing until its query resolves.
const HomeStoriesRail = dynamic(() => import('../../components/stories/HomeStoriesRail'));
import TopPerformers from '../../components/TopPerformers';
// Below-fold form (plus react-hot-toast) splits into its own chunk while still
// server-rendering, so content and SEO are unchanged.
const Newsletter = dynamic(() => import('../../components/Newsletter'));
import AdSlot from '../../components/advertisements/AdSlot';
import AdMultiplex from '../../components/advertisements/AdMultiplex';
import EditorialSidebar from '../../components/boards/EditorialSidebar';
import RemoteImage from '../../components/RemoteImage';
import NewsCopy from '../../components/NewsCopy';

import { fetchLiveMatches, fetchMatches } from '../../services/matches';
import { fetchNews } from '../../services/news';
import { newsHref } from '../../utils/newsConstraints';
import { fetchPslLeaders, fetchPslStandings } from '../../services/psl';
import { fetchStreams, isLiveStream } from '../../services/streams';
import { fetchBulkPredictions } from '../../services/predictions';
import { fetchTournaments } from '../../services/tournaments';
import { featuredRun } from '../../lib/predictions';
import { Trophy, ChevronRight } from 'lucide-react';

export const revalidate = 60;

export const metadata = {
  title: 'Live Scores & Cricket Hub',
  description: 'Live cricket scores, fixtures, teams, players and statistics.',
};

export default async function HomePage() {
  // eslint-disable-next-line react-hooks/purity -- Server Component: Date.now() is safe here
  const now = Date.now();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(dayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

  const results = await Promise.allSettled([
      fetchLiveMatches(),
      fetchMatches({ status: 'upcoming', limit: 20 }),
      fetchMatches({ status: 'completed', limit: 20 }),
      // The page renders 1 featured + 4 compact stories; the old default of 50
      // only inflated the API payload and server time.
      fetchNews({ limit: 6 }),
      fetchPslStandings(),
      fetchPslLeaders(),
      // The page renders 3 stream cards, and only the ones actually broadcasting.
      fetchStreams({ status: 'live', limit: 3 }),
      fetchTournaments({ limit: 6, sortBy: 'latest', status: 'active' }),
    ] as const);
  const liveMatches = results[0].status === 'fulfilled' ? results[0].value : [];
  const upcomingMatches = results[1].status === 'fulfilled' ? results[1].value : [];
  const completedMatches = results[2].status === 'fulfilled' ? results[2].value : [];
  const newsList = results[3].status === 'fulfilled' ? results[3].value : [];
  const standings = results[4].status === 'fulfilled' ? results[4].value : [];
  const pslLeaders = results[5].status === 'fulfilled' ? results[5].value : [];
  const streams = results[6].status === 'fulfilled' ? results[6].value : [];
  const activeTournaments = results[7].status === 'fulfilled' ? results[7].value : [];

  const predictionPool = [...(liveMatches || []).slice(0, 4), ...(upcomingMatches || []).slice(0, 6)];
  const predictionIds = predictionPool
    .map((m: any) => String(m.matchId || m.id || ''))
    .filter(Boolean);
  const bulkPredictions = predictionIds.length
    ? await fetchBulkPredictions(predictionIds).catch(() => new Map())
    : new Map();
  const predictionPicks: HomePredictionPick[] = [];
  for (const m of predictionPool) {
    const id = String((m as any).matchId || (m as any).id || '');
    const pred = bulkPredictions.get(id);
    const run = featuredRun(pred);
    if (run) predictionPicks.push({ match: m, run });
    if (predictionPicks.length >= 4) break;
  }

  const live = liveMatches || [];
  const upcoming = (upcomingMatches || []).slice(0, 3);
  const completedAll = (completedMatches || [])
    .filter((m: any) => m && (m.scheduled || m.date))
    .sort(
      (a: any, b: any) =>
        new Date(b.scheduled || b.date).getTime() - new Date(a.scheduled || a.date).getTime()
    );
  const completed = completedAll.slice(0, 3);

  const upcomingFuture = (upcomingMatches || []).filter((m: any) => {
    const s = new Date(m.scheduled || m.date).getTime();
    return !Number.isNaN(s) && s >= now;
  });
  const nextDayUpcoming = upcomingFuture.filter((m: any) => {
    const s = new Date(m.scheduled || m.date).getTime();
    return s < tomorrowEnd.getTime();
  });
  const fallbackUpcoming = nextDayUpcoming.length > 0 ? nextDayUpcoming : upcomingFuture;

  const todayCompleted = (completedMatches || []).filter((m: any) => {
    const s = new Date(m.scheduled || m.date).getTime();
    return !Number.isNaN(s) && s >= dayStart.getTime() && s < tomorrowStart.getTime();
  });

  const recentCompleted = todayCompleted.length > 0 ? todayCompleted : completedAll;

  const tickerMatches = [
    ...live.slice(0, 6),
    ...recentCompleted.slice(0, 4),
    ...fallbackUpcoming.slice(0, 6),
  ];

  const nextUpcoming = (upcomingMatches || [])[0] || null;
  const pslStandings = [...(standings || [])].sort((a: any, b: any) => (a.rank ?? 999) - (b.rank ?? 999));

  // The API is asked for live streams, but the filter is repeated here so a
  // finished broadcast can never slip into a section that promises a live one —
  // the section simply disappears instead.
  const liveStreams = (streams || []).filter(isLiveStream);

  const heroMatch = nextUpcoming || live[0] || completed[0] || null;

  return (
    <div className="min-h-screen">
      <MatchTickerBar matches={tickerMatches} />
      <CricketHero match={heroMatch ?? undefined} />

      <div className="mx-auto w-full max-w-site px-4 pt-10 pb-12 sm:px-6">
        <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-12 [&>section]:max-w-none [&>section]:px-0">
            <LiveNowSection matches={live} />

            <WatchNowSection streams={liveStreams} />

            {/* Upcoming Matches */}
            <section className="w-full">
              <SectionHeader title="Upcoming Matches" subtitle="Don't miss the upcoming action" icon="calendar" to="/matches" actionLabel="View all" />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {upcoming.length > 0 ? (
                  upcoming.map((m: any) => (
                    <MatchCard key={m.matchId || m.id} match={m} showVenue />
                  ))
                ) : (
                  <p className="rounded-xl bg-card px-4 py-8 text-center text-sm text-stext ring-1 ring-lborder">
                    No upcoming matches right now.
                  </p>
                )}
              </div>
            </section>

            {/* Cric Stories */}
            <HomeStoriesRail />

            {/* AI Match Predictions */}
            {predictionPicks.length > 0 && <HomePredictions picks={predictionPicks} />}

            {/* Active Series & Tournaments */}
            {activeTournaments.length > 0 && (
              <section className="w-full">
                <SectionHeader
                  title="Active Series & Tournaments"
                  subtitle="Follow ongoing leagues and international tours"
                  icon="trophy"
                  to="/tournaments"
                  actionLabel="All tournaments"
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {activeTournaments.slice(0, 6).map((t: any) => (
                    <Link
                      key={t.id}
                      href={`/tournaments/${encodeURIComponent(t.id)}`}
                      className="card-interactive group flex items-center justify-between gap-3 rounded-xl border border-lborder bg-card px-4 py-3.5"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent">
                          <Trophy size={16} aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-mtext group-hover:text-accent">
                            {t.name}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-stext">
                            {t.category?.name || t.type || 'Tournament'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight
                        size={15}
                        className="shrink-0 text-stext transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
                      />
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* PSL Points Table */}
            {pslStandings.length > 0 && (
              <section className="w-full">
                <SectionHeader
                  title="PSL Points Table"
                  subtitle="Current season standings"
                  icon="trophy"
                  to="/psl"
                  actionLabel="Full table"
                />
                <PointsTable rows={pslStandings} />
              </section>
            )}

            <section className="w-full">
              <AdSlot placement="home-mid" />
            </section>

            {/* PSL Top Performers */}
            {pslLeaders.length > 0 && (
              <section className="w-full">
                <SectionHeader
                  title="Top Performers"
                  subtitle="Leading run scorers and wicket takers in the PSL"
                  icon="trendingup"
                  to="/psl"
                  actionLabel="All stats"
                />
                <TopPerformers leaders={pslLeaders} />
              </section>
            )}

            {/* Recent Results */}
            {completed.length > 0 && (
              <section className="w-full">
                <SectionHeader title="Recent Results" subtitle="Latest match outcomes" icon="trophy" to="/matches?tab=completed" actionLabel="View all" />
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {completed.map((m: any) => (
                    <RecentResultCard key={m.matchId || m.id} match={m} />
                  ))}
                </div>
              </section>
            )}

      {/* News */}
      {newsList.length > 0 && (
        <section className="mx-auto w-full max-w-site px-4 sm:px-6">
          <SectionHeader title="Latest News" subtitle="Stay updated with the cricket world" icon="newspaper" to="/news" actionLabel="All news" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr] lg:items-stretch">
            {newsList[0] && (
              <Link
                href={newsHref(newsList[0])}
                className="news-card card-interactive card-featured group flex h-full flex-col overflow-hidden rounded-md lg:h-[448px]"
              >
                <div className="news-card-media relative aspect-[16/9] w-full shrink-0 overflow-hidden bg-secondary lg:aspect-auto lg:h-0 lg:min-h-0 lg:flex-1">
                  {newsList[0].image ? (
                    <RemoteImage
                      src={newsList[0].image}
                      alt={newsList[0].title}
                      fill
                      sizes="(min-width: 1024px) 55vw, 100vw"
                      fit="cover"
                      objectPosition="top"
                      className="news-image object-cover object-top"
                    />
                  ) : (
                    <div className="h-full w-full media-fallback" />
                  )}
                  <div className="absolute left-4 top-4 z-10">
                    <span className="inline-block rounded-full bg-[var(--color-brand)] px-3 py-1 text-[10px] font-medium tracking-wide text-white">
                      {typeof newsList[0].category === 'string'
                        ? newsList[0].category
                        : typeof newsList[0].category === 'object' && newsList[0].category && 'name' in newsList[0].category
                          ? String((newsList[0].category as any).name)
                          : 'News'}
                    </span>
                  </div>
                </div>
                <div className="shrink-0 p-4 sm:p-5">
                  <NewsCopy as="h3" language={newsList[0].language} text={newsList[0].title} className="line-clamp-2 text-base font-bold leading-snug text-mtext group-hover:text-accent sm:text-lg">{newsList[0].title}</NewsCopy>
                  {newsList[0].excerpt && (
                    <NewsCopy language={newsList[0].language} text={newsList[0].excerpt} className="news-copy-card mt-1.5 line-clamp-2 text-xs leading-relaxed text-stext sm:text-sm">{newsList[0].excerpt}</NewsCopy>
                  )}
                  <p className="mt-2.5 text-xs text-stext">{newsList[0].date} • {newsList[0].readTime}</p>
                </div>
              </Link>
            )}
            <div className="grid grid-cols-1 gap-2.5 lg:h-[448px] lg:grid-rows-4">
              {newsList.slice(1, 5).map((item) => (
                <Link
                  key={item.id}
                  href={newsHref(item)}
                  className="news-card card-interactive group flex h-full items-center gap-3 overflow-hidden rounded-md p-2.5 sm:gap-4 sm:p-3"
                >
                  <div className="news-card-media relative h-16 w-20 shrink-0 overflow-hidden rounded-md bg-secondary sm:h-20 sm:w-24">
                    {item.image ? (
                      <RemoteImage src={item.image} alt={item.title} fill sizes="96px" fit="cover" objectPosition="top" className="news-image object-cover object-top" />
                    ) : (
                      <div className="h-full w-full media-fallback" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-accent">
                      {typeof item.category === 'string'
                        ? item.category
                        : typeof item.category === 'object' && item.category && 'name' in item.category
                          ? String((item.category as any).name)
                          : 'News'}
                    </span>
                    <NewsCopy as="h4" language={item.language} text={item.title} className="news-copy-card mt-1 line-clamp-2 text-sm font-bold leading-snug text-mtext group-hover:text-accent">{item.title}</NewsCopy>
                    <p className="mt-1 text-[11px] text-stext">{item.date} • {item.readTime}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

            {/* Multiplex sits between the news block and the gallery strip */}
            <section className="w-full">
              <AdMultiplex placement="home-multiplex" />
            </section>

            <HomeGalleryStrip />

            <Newsletter />
          </div>
          <EditorialSidebar
            topPlacement="home-sidebar"
            bottomPlacement="home-skyscraper"
            variant="home"
          />
        </div>
      </div>
    </div>
  );
}
