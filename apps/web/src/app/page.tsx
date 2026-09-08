import Link from 'next/link';
import MatchCard from '../components/MatchCard';
import SectionHeader from '../components/SectionHeader';
import MatchTickerBar from '../components/MatchTickerBar';
import CricketHero from '../components/CricketHero';
import PslSpotlight from '../components/PslSpotlight';
import RecentResultCard from '../components/RecentResultCard';
import Newsletter from '../components/Newsletter';
import TeamLogo from '../components/TeamLogo';
import { LeaderPanel } from '../components/HomeLeaderPanel';
import { getInitials } from '../utils/helpers';
import { fetchMatches } from '../services/matches';
import { fetchNews } from '../services/news';
import { fetchPslLeaders, fetchPslStandings } from '../services/psl';
import { fetchTeams } from '../services/teams';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Live Scores & Cricket Hub',
  description: 'Live cricket scores, fixtures, teams, players and statistics.',
};

export default async function HomePage() {
  const [liveMatches, upcomingMatches, completedMatches, allMatches, newsList, leaders, teams, standings] =
    await Promise.all([
      fetchMatches({ status: 'live', limit: 10 }),
      fetchMatches({ status: 'upcoming', limit: 20 }),
      fetchMatches({ status: 'completed', limit: 60 }),
      fetchMatches({ limit: 20 }),
      fetchNews(),
      fetchPslLeaders(),
      fetchTeams(),
      fetchPslStandings(),
    ]);

  const live = liveMatches || [];
  const upcoming = (upcomingMatches || []).slice(0, 4);
  const completedAll = (completedMatches || [])
    .filter((m: any) => m && (m.scheduled || m.date))
    .sort(
      (a: any, b: any) =>
        new Date(b.scheduled || b.date).getTime() - new Date(a.scheduled || a.date).getTime()
    );
  const completed = completedAll.slice(0, 3);
  const all = allMatches || [];

  const now = Date.now();
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const tomorrowStart = new Date(dayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setDate(tomorrowEnd.getDate() + 1);

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

  const wickets = (leaders || []).find((g: any) => g.category === 'bowling' && g.stat === 'top_wickets');
  const runs = (leaders || []).find((g: any) => g.category === 'batting' && g.stat === 'top_runs');
  const leaderPanels = [runs, wickets].filter(Boolean);

  const topTeams = (teams || []).slice(0, 6);

  const pslStandings = [...(standings || [])].sort((a: any, b: any) => (a.rank ?? 999) - (b.rank ?? 999));

  const newsForHero = newsList.length > 0 ? newsList[0] : null;

  const getHomeTeam = (m: any) => {
    const t = m.teams;
    if (t && typeof t === 'object' && !Array.isArray(t)) return t.home;
    return null;
  };
  const getAwayTeam = (m: any) => {
    const t = m.teams;
    if (t && typeof t === 'object' && !Array.isArray(t)) return t.away;
    return null;
  };

  return (
    <div className="min-h-screen">
      <MatchTickerBar matches={tickerMatches} />

      <CricketHero match={nextUpcoming || all[0]} />

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 mt-8">
        <SectionHeader title="Upcoming Matches" subtitle="Don't miss the upcoming action" icon="calendar" to="/matches" actionLabel="View all matches" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {upcoming.map((m: any) => (
            <MatchCard key={m.matchId || m.id} match={m} compact />
          ))}
        </div>
      </section>

      <PslSpotlight standings={pslStandings} nextFixture={
        nextUpcoming ? {
          homeCode: getHomeTeam(nextUpcoming)?.code || '',
          homeName: getHomeTeam(nextUpcoming)?.name || '',
          awayCode: getAwayTeam(nextUpcoming)?.code || '',
          awayName: getAwayTeam(nextUpcoming)?.name || '',
          date: nextUpcoming.date || '',
          time: nextUpcoming.time || '',
          venue: nextUpcoming.venue || '',
        } : undefined
      } />

      {leaderPanels.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
          <SectionHeader title="Season Leaders" subtitle="Top performers of the tournament" icon="zap" to="/stats" actionLabel="All stats" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {leaderPanels.map((g: any) => (
              <LeaderPanel key={g.stat} group={g} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
        <SectionHeader title="Popular Teams" subtitle="Fan favorites across the globe" icon="users" to="/teams" actionLabel="View all teams" />
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {topTeams.map((team: any) => (
            <TeamQuickCard key={team.id} team={team} />
          ))}
        </div>
      </section>

      {completed.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
          <SectionHeader title="Recent Results" subtitle="Latest match outcomes" icon="trophy" to="/matches?tab=completed" actionLabel="View all results" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {completed.map((m: any) => (
              <RecentResultCard key={m.matchId || m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      {newsList.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
          <SectionHeader title="Latest News" subtitle="Stay updated with the cricket world" icon="newspaper" to="/news" actionLabel="All news" />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr]">
            {/* Featured article */}
            {newsList[0] && (
              <Link
                href={`/news/${newsList[0].id}`}
                className="group overflow-hidden rounded-xl bg-card ring-1 ring-lborder transition-all duration-300 hover:-translate-y-0.5 hover:bg-elevated hover:ring-accent/30"
              >
                <div className="relative h-56 overflow-hidden sm:h-64">
                  {newsList[0].image ? (
                    <img
                      src={newsList[0].image}
                      alt={newsList[0].title}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <div className={`h-full w-full bg-gradient-to-br ${newsList[0].imageGradient || 'from-slate-600 to-slate-800'}`} />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute left-4 top-4">
                    <span className="inline-block rounded-full bg-accent px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                      {newsList[0].tag || newsList[0].category}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-bold leading-snug text-mtext group-hover:text-accent">
                    {newsList[0].title}
                  </h3>
                  <p className="mt-2 line-clamp-2 text-sm text-stext">{newsList[0].excerpt}</p>
                  <p className="mt-3 text-xs text-stext">{newsList[0].date} • {newsList[0].readTime}</p>
                </div>
              </Link>
            )}

            {/* Smaller articles */}
            <div className="flex flex-col gap-4">
              {newsList.slice(1, 5).map((item) => (
                <Link
                  key={item.id}
                  href={`/news/${item.id}`}
                  className="group flex gap-4 overflow-hidden rounded-xl bg-card p-3 ring-1 ring-lborder transition-all duration-300 hover:bg-elevated hover:ring-accent/30"
                >
                  <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-lg">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className={`h-full w-full bg-gradient-to-br ${item.imageGradient || 'from-slate-600 to-slate-800'}`} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="inline-block rounded-full bg-accent/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-accent">
                      {item.tag || item.category}
                    </span>
                    <h4 className="mt-1 line-clamp-2 text-sm font-bold leading-snug text-mtext group-hover:text-accent">
                      {item.title}
                    </h4>
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

function TeamQuickCard({ team }: { team: any }) {
  const name = team.name || '';
  const code = team.shortName || team.abbr || team.code || '';

  return (
    <Link
      href={`/teams/${team.id}`}
      className="group flex flex-col items-center justify-center rounded-xl bg-card p-5 text-center ring-1 ring-lborder transition-all duration-300 hover:-translate-y-1 hover:bg-elevated hover:ring-accent/30 hover:shadow-lg"
    >
      <TeamLogo teamId={team.id} name={name} code={code} size="md" link={false} />
      <p className="mt-3 w-full truncate text-[13px] font-semibold text-mtext group-hover:text-accent transition-colors">{name}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-stext">{code}</p>
    </Link>
  );
}
