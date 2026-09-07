import Link from 'next/link';
import MatchCard from '../components/MatchCard';
import SectionHeader from '../components/SectionHeader';
import AdBanner from '../components/AdBanner';
import LiveMatchesCarousel from '../components/LiveMatchesCarousel';
import CricketHero from '../components/CricketHero';
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
  const [liveMatches, upcomingMatches, newsList, leaders, teams] = await Promise.all([
    fetchMatches({ status: 'live', limit: 10 }),
    fetchMatches({ status: 'upcoming', limit: 4 }),
    fetchNews(),
    fetchPslLeaders(),
    fetchTeams(),
  ]);

  const live = liveMatches || [];
  const upcoming = (upcomingMatches || []).slice(0, 4);

  const wickets = (leaders || []).find((g) => g.category === 'bowling' && g.stat === 'top_wickets');
  const runs = (leaders || []).find((g) => g.category === 'batting' && g.stat === 'top_runs');
  const leaderPanels = [runs, wickets].filter(Boolean);

  const topTeams = (teams || []).slice(0, 6);

  return (
    <div className="min-h-screen">
      <CricketHero />

      <section className="mx-auto mt-14 max-w-7xl px-4 pb-12 sm:px-6">
        <LiveMatchesCarousel matches={live} />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <SectionHeader title="Upcoming Matches" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {upcoming.map((m) => (
            <MatchCard key={m.matchId} match={m} compact />
          ))}
        </div>
      </section>

      {leaderPanels.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
          <SectionHeader title="Season Leaders" to="/stats" actionLabel="All stats" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {leaderPanels.map((g) => (
              <LeaderPanel key={g.stat} group={g} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <SectionHeader title="Cricket Teams" to="/teams" actionLabel="All teams" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {topTeams.map((team) => (
            <TeamQuickCard key={team.id} team={team} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <AdBanner variant="horizontal" />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
        <SectionHeader title="Latest News" to="/news" actionLabel="All news" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {newsList.slice(0, 4).map((item, i) => (
            <Link
              key={item.id}
              href={`/news/${item.id}`}
              className={`group overflow-hidden rounded-2xl bg-card ring-1 ring-lborder transition-all duration-300 hover:-translate-y-0.5 hover:bg-elevated hover:ring-accent/30 ${i === 0 ? 'hidden' : ''}`}
            >
              <div className={`relative h-32 overflow-hidden ${item.image ? '' : `bg-gradient-to-br ${item.imageGradient || 'from-slate-600 to-slate-800'}`}`}>
                {item.image && (
                  <img src={item.image} alt={item.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute left-3 top-3">
                  <span className="inline-block rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                    {item.tag || item.category}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="line-clamp-2 text-sm font-bold leading-snug text-mtext group-hover:text-accent">{item.title}</h3>
                <p className="mt-2 line-clamp-2 text-xs text-stext">{item.excerpt}</p>
                <p className="mt-3 text-[11px] text-stext">{item.date} • {item.readTime}</p>
              </div>
            </Link>
          ))}

        </div>
      </section>
    </div>
  );
}

function TeamQuickCard({ team }: { team: any }) {
  const name = team.name || '';
  const code = team.abbr || '';

  let hash = 0;
  for (let i = 0; i < code.length; i++) hash = code.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);
  return (
    <Link
      href={`/teams/${team.id}`}
      className="group flex flex-col items-center justify-center rounded-2xl bg-card p-5 text-center ring-1 ring-lborder transition-all duration-300 hover:-translate-y-1 hover:bg-elevated hover:ring-accent/30 hover:shadow-lg"
    >
      {team.logoUrl ? (
        <img
          src={team.logoUrl}
          alt={name}
          className="relative h-12 w-12 shrink-0 rounded-full border border-white/10 bg-primary object-cover shadow-sm transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <span
          className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/10 text-sm font-bold tracking-wider text-white shadow-sm transition-transform duration-300 group-hover:scale-105"
          style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 80%, 60%), hsl(${(hue + 40) % 360}, 90%, 40%))` }}
        >
          {getInitials(name || code)}
        </span>
      )}
      <p className="mt-3 w-full truncate text-[14px] font-semibold text-mtext group-hover:text-accent transition-colors">{name}</p>
    </Link>
  );
}
