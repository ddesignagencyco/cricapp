import Link from 'next/link';
import { ArrowRight, Calendar, Eye, Trophy, Users, Zap } from 'lucide-react';
import LiveMatchCard from '../components/LiveMatchCard.jsx';
import MatchCard from '../components/MatchCard.jsx';
import SectionHeader from '../components/SectionHeader.jsx';
import LiveIndicator from '../components/LiveIndicator.jsx';
import AdBanner from '../components/AdBanner.jsx';
import { fetchMatches, fetchNews, fetchPSLTeams, fetchStreams } from '../services/cricketApi.js';

export const metadata = {
  title: 'Live Scores & PSL Hub',
  description:
    'Live cricket scores, PSL fixtures, teams, players and statistics. Every run. Every ball. Live.',
};

const quickLinks = [
  { label: 'Live Scores', to: '/live', icon: Zap },
  { label: 'Points Table', to: '/points-table', icon: Trophy },
  { label: 'Teams', to: '/teams', icon: Users },
  { label: 'Match Centre', to: '/matches', icon: Calendar },
];

const topPlayers = [
  { name: 'Mohammad Rizwan', runs: 512, sixes: 26 },
  { name: 'Fakhar Zaman', runs: 498, sixes: 24 },
  { name: 'Shan Masood', runs: 472, sixes: 21 },
];

export default async function HomePage() {
  const [allMatches, pslTeams, newsList, streams] = await Promise.all([
    fetchMatches(),
    fetchPSLTeams(),
    fetchNews(),
    fetchStreams(),
  ]);

  const live = allMatches.filter((m) => m.status === 'live');
  const upcoming = allMatches.filter((m) => m.status === 'upcoming').slice(0, 4);
  const featured = live.find((m) => m.id === 'm1') || live[0] || null;

  const topRunsPlayer = topPlayers[0];

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden">
        <div
          className="hero-grad absolute inset-0"
        />
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-accent2/10 blur-3xl" />

        <div className="hero-content relative mx-auto max-w-7xl px-4 pb-14 pt-14 sm:px-6 sm:pt-20">
          <div className="mb-10 max-w-3xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 ring-1 ring-inset ring-accent/25">
              <LiveIndicator label="Live Cricket" />
            </div>
            <h1 className="hero-title text-4xl font-black leading-tight tracking-tight sm:text-6xl">
              CRICKET <span className="text-accent">LIVE</span>
            </h1>
            <p className="hero-lead mt-4 max-w-xl text-base sm:text-lg">
              Live scores, match updates, PSL fixtures, teams and player
              statistics. Every run. Every ball. Live.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {quickLinks.map((q) => (
                <Link
                  key={q.label}
                  href={q.to}
                  className="inline-flex items-center gap-2 rounded-xl bg-card px-4 py-2.5 text-sm font-semibold text-mtext ring-1 ring-lborder transition-all hover:-translate-y-0.5 hover:bg-elevated hover:ring-accent/40"
                >
                  <q.icon size={15} className="text-accent" />
                  {q.label}
                </Link>
              ))}
            </div>
          </div>

          {featured ? (
            <LiveMatchCard match={featured} />
          ) : (
            <div className="rounded-3xl bg-card/60 p-10 text-center ring-1 ring-lborder">
              <p className="text-stext">No live matches at the moment.</p>
              <Link href="/matches" className="mt-3 inline-block text-sm font-semibold text-accent hover:text-accent2">
                See incoming matches <ArrowRight size={14} className="inline" />
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto mt-10 max-w-7xl px-4 pb-12 sm:px-6">
        <SectionHeader
          title="Live Matches"
          subtitle="Match Centre"
          icon="zap"
          to="/live"
          actionLabel="View all"
        />
        {live.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {live.slice(0, 4).map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-card px-6 py-8 text-center text-stext ring-1 ring-lborder">
            No matches live right now — check back soon.
          </div>
        )}
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <SectionHeader title="Upcoming Matches" subtitle="Fixtures" icon="calendar" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {upcoming.map((m) => (
            <MatchCard key={m.id} match={m} compact />
          ))}
        </div>
      </section>

      {streams.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
          <SectionHeader title="Watch Live" subtitle="Live Streaming" icon="video" to="/streams" actionLabel="All streams" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {streams.slice(0, 2).map((s) => (
              <Link
                key={s.id}
                href="/streams"
                className="group relative flex min-h-[140px] flex-col justify-between overflow-hidden rounded-2xl ring-1 ring-lborder transition-all duration-300 hover:-translate-y-0.5 hover:ring-accent/40"
              >
                <div
                  className={`absolute inset-0 bg-cover bg-center ${s.image ? '' : `bg-gradient-to-br ${s.theme || 'from-cyan-700 to-blue-900'}`}`}
                  style={s.image ? { backgroundImage: `url(${s.image})` } : undefined}
                />
                <div className="pointer-events-none absolute inset-0 bg-black/40 group-hover:bg-black/25 transition-colors" />
                <div className="relative z-10 p-5">
                  <div className="flex items-center justify-between gap-2">
                    <LiveIndicator label="Live" />
                    <span className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                      <Eye size={13} className="text-accent2" /> {s.viewers?.toLocaleString()} watching
                    </span>
                  </div>
                  <h3 className="hero-title mt-4 line-clamp-2 text-lg font-bold leading-snug sm:text-xl">
                    {s.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-300">
                    {s.host}{s.coHost ? ` & ${s.coHost}` : ''}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionHeader title="PSL 2026" subtitle="Pakistan Super League" icon="trophy" to="/psl" actionLabel="Explore PSL" />
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {pslTeams.map((team) => (
                <TeamMiniCard key={team.id} team={team} />
              ))}
            </div>
          </div>

          <div>
            <SectionHeader title="Top Performers" subtitle="This Season" icon="zap" />
            <div className="space-y-3 rounded-2xl bg-card p-5 ring-1 ring-lborder">
              <p className="text-[11px] font-bold uppercase tracking-widest text-stext">
                Most Runs
              </p>
              {topPlayers.map((p, i) => (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="grid h-7 w-7 place-items-center rounded-lg bg-elevated font-mono text-xs font-bold text-accent">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-mtext">{p.name}</p>
                    <p className="text-xs text-stext">{p.sixes} sixes</p>
                  </div>
                  <span className={`font-mono text-base font-bold tabular-nums ${p.name === topRunsPlayer.name ? 'text-accent2' : 'text-mtext'}`}>
                    {p.runs}
                  </span>
                </div>
              ))}
              <Link href="/stats" className="mt-2 flex items-center gap-1 text-sm font-semibold text-accent hover:text-accent2">
                Full statistics <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6">
        <AdBanner variant="horizontal" />
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
        <SectionHeader title="Latest News" subtitle="Reports & Updates" icon="newspaper" to="/news" actionLabel="All news" />
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
          {newsList.slice(0, 4).map((item) => (
            <Link
              key={item.id}
              href={`/news/${item.id}`}
              className="group overflow-hidden rounded-2xl bg-card ring-1 ring-lborder transition-all duration-300 hover:-translate-y-0.5 hover:bg-elevated hover:ring-accent/30"
            >
              <div className={`relative h-32 overflow-hidden ${item.image ? '' : `bg-gradient-to-br ${item.imageGradient || 'from-slate-600 to-slate-800'}`}`}>
                {item.image && (
                  <img
                    src={item.image}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute left-3 top-3">
                  <span className="inline-block rounded-full bg-black/50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                    {item.tag || item.category}
                  </span>
                </div>
              </div>
              <div className="p-4">
                <h3 className="line-clamp-2 text-sm font-bold leading-snug text-mtext group-hover:text-accent">
                  {item.title}
                </h3>
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

function TeamMiniCard({ team }) {
  return (
    <Link
      href={`/teams/${team.id}`}
      className="group rounded-2xl bg-card p-4 ring-1 ring-lborder transition-all duration-300 hover:-translate-y-0.5 hover:bg-elevated hover:ring-accent/30"
    >
      <p className="text-sm font-bold text-mtext">{team.name}</p>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-stext">
        {team.code} • {team.points} pts
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-elevated">
        <div
          className="h-full rounded-full"
          style={{ width: `${(team.wins / team.matches) * 100}%`, background: team.colors.primary }}
        />
      </div>
    </Link>
  );
}
