import Link from 'next/link';
import MatchCardCompact from '../components/MatchCardCompact';
import SectionHeader from '../components/SectionHeader';
import MatchTickerBar from '../components/MatchTickerBar';
import CricketHero from '../components/CricketHero';
import PslSpotlight from '../components/PslSpotlight';
import RecentResultCard from '../components/RecentResultCard';
import Newsletter from '../components/Newsletter';
import TeamLogo from '../components/TeamLogo';

import { fetchMatches } from '../services/matches';
import { fetchNews } from '../services/news';
import { fetchPslStandings } from '../services/psl';
import { fetchTeams } from '../services/teams';

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

  const [liveMatches, upcomingMatches, completedMatches, allMatches, newsList, teams, standings] =
    await Promise.all([
      fetchMatches({ status: 'live', limit: 10 }),
      fetchMatches({ status: 'upcoming', limit: 20 }),
      fetchMatches({ status: 'completed', limit: 60 }),
      fetchMatches({ limit: 20 }),
      fetchNews(),
      fetchTeams(),
      fetchPslStandings(),
    ]);

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
  const topTeams = (teams || []).slice(0, 6);
  const pslStandings = [...(standings || [])].sort((a: any, b: any) => (a.rank ?? 999) - (b.rank ?? 999));

  return (
    <div className="min-h-screen">
      <MatchTickerBar matches={tickerMatches} />
      <CricketHero match={nextUpcoming || all[0]} />

      {/* Upcoming Matches */}
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 mt-8">
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

      {/* PSL Spotlight */}
      <PslSpotlight standings={pslStandings} />

      {/* Teams */}
      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
        <SectionHeader title="Popular Teams" subtitle="Fan favorites across the globe" icon="users" to="/teams" actionLabel="View all" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 lg:grid-cols-6">
          {topTeams.map((team: any) => (
            <Link
              key={team.id}
              href={`/teams/${team.id}`}
              className="group flex min-h-28 flex-col items-center justify-center rounded-2xl bg-card p-3 text-center ring-1 ring-lborder transition-all duration-300 hover:-translate-y-1 hover:bg-elevated hover:ring-accent/30 hover:shadow-lg sm:p-4"
            >
              <TeamLogo teamId={team.id} name={team.name} code={team.shortName || team.abbr || team.code} size="md" link={false} />
              <p className="mt-2 w-full truncate text-xs font-semibold text-mtext transition-colors group-hover:text-accent">{team.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent Results */}
      {completed.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
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
        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
          <SectionHeader title="Latest News" subtitle="Stay updated with the cricket world" icon="newspaper" to="/news" actionLabel="All news" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.15fr_0.85fr]">
            {newsList[0] && (
              <Link
                href={`/news/${newsList[0].id}`}
                className="group overflow-hidden rounded-2xl bg-card ring-1 ring-lborder transition-all duration-300 hover:-translate-y-0.5 hover:bg-elevated hover:ring-accent/30"
              >
                <div className="relative h-48 overflow-hidden sm:h-60">
                  {newsList[0].image ? (
                    <img src={newsList[0].image} alt={newsList[0].title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className={`h-full w-full bg-gradient-to-br ${newsList[0].imageGradient || 'from-slate-600 to-slate-800'}`} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute left-4 top-4">
                    <span className="inline-block rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
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
                  <h3 className="text-base font-bold leading-snug text-mtext group-hover:text-accent sm:text-lg">{newsList[0].title}</h3>
                  <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-stext sm:text-sm">{newsList[0].excerpt}</p>
                  <p className="mt-3 text-xs text-stext">{newsList[0].date} • {newsList[0].readTime}</p>
                </div>
              </Link>
            )}
            <div className="flex flex-col gap-2.5">
              {newsList.slice(1, 5).map((item) => (
                <Link
                  key={item.id}
                  href={`/news/${item.id}`}
                  className="group flex gap-3 overflow-hidden rounded-xl bg-card p-2.5 ring-1 ring-lborder transition-all duration-300 hover:bg-elevated hover:ring-accent/30 sm:gap-4 sm:p-3"
                >
                  <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-lg sm:h-20 sm:w-24">
                    {item.image ? (
                      <img src={item.image} alt={item.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className={`h-full w-full bg-gradient-to-br ${item.imageGradient || 'from-slate-600 to-slate-800'}`} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                      {typeof item.tag === 'string' && item.tag
                        ? item.tag
                        : typeof item.category === 'string'
                          ? item.category
                          : typeof item.category === 'object' && item.category && 'name' in item.category
                            ? String((item.category as any).name)
                            : 'News'}
                    </span>
                    <h4 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-mtext group-hover:text-accent">{item.title}</h4>
                    <p className="mt-1 text-[11px] text-stext">{item.date} • {item.readTime}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Newsletter />
    </div>
  );
}
