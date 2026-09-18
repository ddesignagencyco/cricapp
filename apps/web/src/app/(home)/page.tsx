import Link from 'next/link';
import MatchCardCompact from '../../components/MatchCardCompact';
import LiveNowSection from '../../components/LiveNowSection';
import SectionHeader from '../../components/SectionHeader';
import MatchTickerBar from '../../components/MatchTickerBar';
import CricketHero from '../../components/CricketHero';
import PslSpotlight from '../../components/PslSpotlight';
import RecentResultCard from '../../components/RecentResultCard';
import TopPerformers from '../../components/TopPerformers';
import Newsletter from '../../components/Newsletter';
import AdSlot from '../../components/AdSlot';
import RemoteImage from '../../components/RemoteImage';
import NewsCopy from '../../components/NewsCopy';
import Badge, { StatusBadge } from '../../components/Badge';

import HomePredictions, { type HomePredictionPick } from '../../components/predictions/HomePredictions';
import { featuredRun } from '../../lib/predictions';
import { fetchLiveMatches, fetchMatches } from '../../services/matches';
import { fetchNews } from '../../services/news';
import { fetchMatchPredictions } from '../../services/predictions';
import { newsHref } from '../../utils/newsConstraints';
import { fetchPslLeaders, fetchPslStandings } from '../../services/psl';
import { fetchStreams } from '../../services/streams';
import type { Match } from '../../types';

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
      fetchMatches({ status: 'completed', limit: 60 }),
      fetchMatches({ limit: 20 }),
      fetchNews(),
      fetchPslStandings(),
      fetchPslLeaders(),
      fetchStreams({ limit: 8 }),
    ] as const);
  const liveMatches = results[0].status === 'fulfilled' ? results[0].value : [];
  const upcomingMatches = results[1].status === 'fulfilled' ? results[1].value : [];
  const completedMatches = results[2].status === 'fulfilled' ? results[2].value : [];
  const allMatches = results[3].status === 'fulfilled' ? results[3].value : [];
  const newsList = results[4].status === 'fulfilled' ? results[4].value : [];
  const standings = results[5].status === 'fulfilled' ? results[5].value : [];
  const pslLeaders = results[6].status === 'fulfilled' ? results[6].value : [];
  const streams = results[7].status === 'fulfilled' ? results[7].value : [];
  const galleryPhotos = (newsList || []).filter((item) => item.image).slice(0, 6);

  const live = liveMatches || [];
  const upcoming = (upcomingMatches || []).slice(0, 5);
  const completedAll = (completedMatches || [])
    .filter((m: any) => m && (m.scheduled || m.date))
    .sort(
      (a: any, b: any) =>
        new Date(b.scheduled || b.date).getTime() - new Date(a.scheduled || a.date).getTime()
    );
  const completed = completedAll.slice(0, 3);
  const all = allMatches || [];

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

  const predictionCandidates = new Map<string, Match>();
  for (const match of [...live, ...(upcomingMatches || []).slice(0, 8)]) {
    const id = String(match.matchId || match.id || '');
    if (id) predictionCandidates.set(id, match);
  }
  const predictionMatches = [...predictionCandidates.values()].slice(0, 8);
  const predictionRows = await Promise.all(
    predictionMatches.map(async (match) => {
      const predictions = await fetchMatchPredictions(String(match.matchId || match.id)).catch(() => null);
      const run = featuredRun(predictions);
      return run ? ({ match, run } satisfies HomePredictionPick) : null;
    })
  );
  const predictionPicks = predictionRows.filter((row): row is HomePredictionPick => row != null);

  return (
    <div className="min-h-screen">
      <MatchTickerBar matches={tickerMatches} />
      <CricketHero match={nextUpcoming || all[0]} />

      <div className="flex flex-col gap-12 pt-12 pb-12">
      <LiveNowSection matches={live} />

      <HomePredictions picks={predictionPicks} />

      {streams.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <SectionHeader title="Watch Now" subtitle="Live streams and featured videos" icon="video" to="/gallery?tab=videos" actionLabel="All videos" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {streams.slice(0, 3).map((stream) => (
              <Link key={stream.id} href="/streams" className="group overflow-hidden rounded-2xl bg-card ring-1 ring-lborder hover:ring-border-strong">
                <div className="flex items-center border-b border-lborder px-3 py-2">
                  {stream.status === 'ended' ? (
                    <Badge>Ended</Badge>
                  ) : (
                    <StatusBadge status={stream.status || 'upcoming'} />
                  )}
                </div>
                <div className="relative aspect-video bg-[var(--color-skeleton)]">
                  {stream.image ? (
                    <RemoteImage src={stream.image} alt={stream.title} fill sizes="400px" fit="contain" className="news-image" />
                  ) : (
                    <div className="grid h-full place-items-center media-fallback text-stext">▶</div>
                  )}
                  <span className="absolute inset-0 grid place-items-center">
                    <span className="grid h-11 w-11 place-items-center rounded-full bg-black/55 text-sm text-white">▶</span>
                  </span>
                </div>
                <div className="p-3">
                  <p className="line-clamp-2 text-sm font-semibold text-mtext group-hover:text-accent">{stream.title}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Matches */}
      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <SectionHeader title="Upcoming Matches" subtitle="Don't miss the upcoming action" icon="calendar" to="/matches" actionLabel="View all" />
        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-2">
          {upcoming.length > 0 ? (
            upcoming.map((m: any) => (
              <MatchCardCompact key={m.matchId || m.id} match={m} />
            ))
          ) : (
            <p className="rounded-xl bg-card px-4 py-8 text-center text-sm text-stext ring-1 ring-lborder">
              No upcoming matches right now.
            </p>
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <AdSlot slot="home-mid" format="leaderboard" />
      </section>

      {/* PSL Spotlight */}
      <PslSpotlight standings={pslStandings} />

      {/* PSL Top Performers */}
      {pslLeaders.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
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
        <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <SectionHeader title="Recent Results" subtitle="Latest match outcomes" icon="trophy" to="/matches?tab=completed" actionLabel="View all" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            {completed.map((m: any) => (
              <RecentResultCard key={m.matchId || m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      {/* News */}
      {newsList.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <SectionHeader title="Latest News" subtitle="Stay updated with the cricket world" icon="newspaper" to="/news" actionLabel="All news" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            {newsList[0] && (
              <Link
                href={newsHref(newsList[0])}
                className="group overflow-hidden rounded-2xl bg-card ring-1 ring-lborder transition-colors hover:bg-[var(--color-row-hover)] hover:ring-border-strong"
              >
                <div className="relative bg-secondary">
                  {newsList[0].image ? (
                    <RemoteImage
                      src={newsList[0].image}
                      alt={newsList[0].title}
                      width={1600}
                      height={900}
                      sizes="(min-width: 1024px) 55vw, 100vw"
                      fit="contain"
                      className="news-image h-auto w-full"
                    />
                  ) : (
                    <div className="h-48 w-full media-fallback sm:h-60" />
                  )}
                  <div className="absolute left-4 top-4">
                    <span className="inline-block rounded-full bg-[var(--color-brand)] px-3 py-1 text-[10px] font-medium tracking-wide text-white">
                      {typeof newsList[0].tag === 'string' && newsList[0].tag
                        ? newsList[0].tag
                        : typeof newsList[0].category === 'string'
                          ? newsList[0].category
                          : typeof newsList[0].category === 'object' && newsList[0].category && 'name' in newsList[0].category
                            ? String((newsList[0].category as any).name)
                            : 'News'}
                    </span>
                  </div>
                </div>
                <div className="p-4 sm:p-5">
                  <NewsCopy as="h3" language={newsList[0].language} text={newsList[0].title} className="text-base font-bold leading-snug text-mtext group-hover:text-accent sm:text-lg">{newsList[0].title}</NewsCopy>
                  {newsList[0].excerpt && (
                    <NewsCopy language={newsList[0].language} text={newsList[0].excerpt} className="mt-2 line-clamp-2 text-xs leading-relaxed text-stext sm:text-sm">{newsList[0].excerpt}</NewsCopy>
                  )}
                  <p className="mt-3 text-xs text-stext">{newsList[0].date} • {newsList[0].readTime}</p>
                </div>
              </Link>
            )}
            <div className="flex flex-col gap-2.5">
              {newsList.slice(1, 5).map((item) => (
                <Link
                  key={item.id}
                  href={newsHref(item)}
                  className="group flex gap-3 overflow-hidden rounded-xl bg-card p-2.5 ring-1 ring-lborder transition-colors hover:bg-[var(--color-row-hover)] hover:ring-border-strong sm:gap-4 sm:p-3"
                >
                  <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg bg-secondary sm:h-20 sm:w-24">
                    {item.image ? (
                      <RemoteImage src={item.image} alt={item.title} fill sizes="96px" fit="contain" className="news-image" />
                    ) : (
                      <div className="h-full w-full media-fallback" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-accent">
                      {typeof item.tag === 'string' && item.tag
                        ? item.tag
                        : typeof item.category === 'string'
                          ? item.category
                          : typeof item.category === 'object' && item.category && 'name' in item.category
                            ? String((item.category as any).name)
                            : 'News'}
                    </span>
                    <NewsCopy as="h4" language={item.language} text={item.title} className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-mtext group-hover:text-accent">{item.title}</NewsCopy>
                    <p className="mt-1 text-[11px] text-stext">{item.date} • {item.readTime}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {galleryPhotos.length > 0 && (
        <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
          <SectionHeader title="Gallery" subtitle="Images, shorts and videos" icon="images" to="/gallery" actionLabel="Open gallery" />
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {galleryPhotos.map((item) => (
              <Link key={item.id} href="/gallery?tab=images" className="group overflow-hidden rounded-2xl bg-card ring-1 ring-lborder">
                <div className="relative aspect-square bg-secondary">
                  <RemoteImage src={item.image as string} alt={item.title} fill sizes="180px" fit="contain" className="news-image" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <AdSlot slot="home-footer" format="leaderboard" />
      </section>

      <Newsletter />
      </div>
    </div>
  );
}
