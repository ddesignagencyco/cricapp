import Link from 'next/link';
import { Flame, Target, Zap } from 'lucide-react';
import MatchCard from '../components/MatchCard';
import SectionHeader from '../components/SectionHeader';
import AdBanner from '../components/AdBanner';
import LiveMatchesCarousel from '../components/LiveMatchesCarousel';
import CricketHero from '../components/CricketHero';
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

const statMeta: Record<string, { label: string; tone: string }> = {
  top_runs: { label: 'Most Runs', tone: 'text-accent' },
  top_wickets: { label: 'Most Wickets', tone: 'text-accent2' },
  top_sixes: { label: 'Most Sixes', tone: 'text-gold' },
  top_fours: { label: 'Most Fours', tone: 'text-accent2' },
};

export default async function HomePage() {
  const [allMatches, newsList, leaders, teams] = await Promise.all([
    fetchMatches(),
    fetchNews(),
    fetchPslLeaders(),
    fetchTeams(),
  ]);

  const live = (allMatches || []).filter((m) => m.status === 'live');
  const upcoming = (allMatches || []).filter((m) => m.status === 'upcoming').slice(0, 4);

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
        <SectionHeader title="Upcoming Matches" subtitle="Fixtures" icon="calendar" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {upcoming.map((m) => (
            <MatchCard key={m.matchId} match={m} compact />
          ))}
        </div>
      </section>

      {leaderPanels.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
          <SectionHeader title="Season Leaders" subtitle="Top Performers" icon="trophy" to="/stats" actionLabel="All stats" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {leaderPanels.map((g) => (
              <LeaderPanel key={g.stat} group={g} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <SectionHeader title="Cricket Teams" subtitle="All Franchises" icon="users" to="/teams" actionLabel="All teams" />
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
        <SectionHeader title="Latest News" subtitle="Reports & Updates" icon="newspaper" to="/news" actionLabel="All news" />
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

function LeaderPanel({ group }: { group: any }) {
  const meta = statMeta[group.stat] || { label: group.stat.replace(/_/g, ' '), tone: 'text-accent' };
  const StatIcon = group.stat.includes('wicket') || group.stat.includes('maiden') || group.stat.includes('dot')
    ? Target : group.stat.includes('six') || group.stat.includes('four') ? Flame : Zap;
  const entries = [...(group.entries || [])]
    .sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999))
    .slice(0, 4);

  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
      <div className="mb-4 flex items-center gap-2">
        <StatIcon size={16} className="text-accent2" />
        <h3 className="text-sm font-bold uppercase tracking-widest text-mtext">{meta.label}</h3>
      </div>
      <div className="space-y-3">
        {entries.map((row, i) => (
          <Link
            key={row.playerId || i}
            href={`/players/${row.playerId}`}
            className="flex items-center gap-3 rounded-sm p-2 transition-colors hover:bg-elevated"
          >
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-elevated font-mono text-xs font-bold text-accent">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-mtext">{row.playerName}</p>
              <p className="truncate text-xs text-stext">
                {row.teamName} ({row.teamAbbr})
              </p>
            </div>
            <span className={`font-mono text-base font-bold tabular-nums ${meta.tone}`}>
              {row.value}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

function TeamQuickCard({ team }: { team: any }) {
  const name = team.name || '';
  const code = team.abbr || '';
  return (
    <Link
      href={`/teams/${team.id}`}
      className="group rounded-2xl bg-card p-4 ring-1 ring-lborder transition-all duration-300 hover:-translate-y-0.5 hover:bg-elevated hover:ring-accent/30"
    >
      <div className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-accent bg-primary text-xs font-extrabold text-accent">
          {getInitials(name || code)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-mtext">{name}</p>
          <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-stext">
            {code}
          </p>
        </div>
      </div>
    </Link>
  );
}
