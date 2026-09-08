import Link from 'next/link';
import MatchCard from '../components/MatchCard';
import SectionHeader from '../components/SectionHeader';
import MatchTickerBar from '../components/MatchTickerBar';
import CricketHero from '../components/CricketHero';
import NextMatchCountdown from '../components/NextMatchCountdown';
import PslSpotlight from '../components/PslSpotlight';
import RecentResultCard from '../components/RecentResultCard';
import Newsletter from '../components/Newsletter';
import { LeaderPanel } from '../components/HomeLeaderPanel';
import { getInitials } from '../utils/helpers';
import { fetchMatches } from '../services/matches';
import { fetchNews } from '../services/news';
import { fetchPslLeaders } from '../services/psl';
import { fetchTeams } from '../services/teams';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Live Scores & Cricket Hub',
  description: 'Live cricket scores, fixtures, teams, players and statistics.',
};

export default async function HomePage() {
  const [liveMatches, upcomingMatches, completedMatches, allMatches, newsList, leaders, teams] =
    await Promise.all([
      fetchMatches({ status: 'live', limit: 10 }),
      fetchMatches({ status: 'upcoming', limit: 4 }),
      fetchMatches({ status: 'completed', limit: 3 }),
      fetchMatches({ limit: 20 }),
      fetchNews(),
      fetchPslLeaders(),
      fetchTeams(),
    ]);

  const live = liveMatches || [];
  const upcoming = (upcomingMatches || []).slice(0, 4);
  const completed = (completedMatches || []).slice(0, 3);
  const all = allMatches || [];

  const tickerMatches = [...live, ...all.filter((m: any) => m.status !== 'live').slice(0, 8)];

  const nextUpcoming = (upcomingMatches || [])[0] || null;

  const wickets = (leaders || []).find((g: any) => g.category === 'bowling' && g.stat === 'top_wickets');
  const runs = (leaders || []).find((g: any) => g.category === 'batting' && g.stat === 'top_runs');
  const leaderPanels = [runs, wickets].filter(Boolean);

  const topTeams = (teams || []).slice(0, 6);

  const pslStandings = (teams || [])
    .filter((t: any) => !['england', 'australia', 'india', 'new-zealand', 'south-africa'].includes(t.id))
    .sort((a: any, b: any) => (a.position || 99) - (b.position || 99))
    .map((t: any) => ({
      teamId: t.id,
      teamName: t.name,
      teamAbbr: t.shortName || t.code,
      played: t.matches || 0,
      won: t.wins || 0,
      lost: t.losses || 0,
      netRunRate: parseFloat(t.nrr) || 0,
      points: t.points || 0,
    }));

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

      {nextUpcoming && <NextMatchCountdown match={nextUpcoming} />}

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <SectionHeader title="Upcoming Matches" to="/matches" actionLabel="View all matches" />
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
        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
          <SectionHeader title="Season Leaders" to="/stats" actionLabel="All stats" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {leaderPanels.map((g: any) => (
              <LeaderPanel key={g.stat} group={g} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <SectionHeader title="Popular Teams" to="/teams" actionLabel="View all teams" />
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          {topTeams.map((team: any) => (
            <TeamQuickCard key={team.id} team={team} />
          ))}
        </div>
      </section>

      {completed.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
          <SectionHeader title="Recent Results" to="/matches" actionLabel="View all results" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {completed.map((m: any) => (
              <RecentResultCard key={m.matchId || m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      {newsList.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
          <SectionHeader title="Latest News" to="/news" actionLabel="All news" />

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

  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);
  return (
    <Link
      href={`/teams/${team.id}`}
      className="group flex flex-col items-center justify-center rounded-xl bg-card p-5 text-center ring-1 ring-lborder transition-all duration-300 hover:-translate-y-1 hover:bg-elevated hover:ring-accent/30 hover:shadow-lg"
    >
      {team.logo ? (
        <img
          src={team.logo}
          alt={name}
          className="relative h-14 w-14 shrink-0 rounded-full border-2 border-white/10 bg-primary object-cover shadow-sm transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <span
          className="grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 border-white/10 text-base font-bold tracking-wider text-white shadow-sm transition-transform duration-300 group-hover:scale-105"
          style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 80%, 60%), hsl(${(hue + 40) % 360}, 90%, 40%))` }}
        >
          {getInitials(name || code)}
        </span>
      )}
      <p className="mt-3 w-full truncate text-[13px] font-semibold text-mtext group-hover:text-accent transition-colors">{name}</p>
      <p className="text-[10px] font-bold uppercase tracking-wider text-stext">{code}</p>
    </Link>
  );
}
