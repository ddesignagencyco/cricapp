import Link from 'next/link';
import { ArrowRight, Crown, MapPin } from 'lucide-react';
import MatchCard from '../../components/MatchCard.jsx';
import TeamCard from '../../components/TeamCard.jsx';
import SectionHeader from '../../components/SectionHeader.jsx';
import PointsTable from '../../components/PointsTable.jsx';
import Badge from '../../components/Badge.jsx';
import TeamLogo from '../../components/TeamLogo.jsx';
import { fetchMatches, fetchPSLTeams, fetchTournaments } from '../../services/cricketApi.js';

export const metadata = {
  title: 'PSL 2026',
  description:
    'Pakistan Super League — six franchises, one mission. Live scores, fixtures, tables and player stats.',
};

const qualifierSteps = [
  { label: 'Qualifier', desc: '1st vs 2nd — winners to Final', tone: 'qualified' },
  { label: 'Eliminator 1', desc: '3rd vs 4th — losers eliminated', tone: 'playoffs' },
  { label: 'Eliminator 2', desc: 'Qualifier loser vs Eliminator 1 winner', tone: 'playoffs' },
  { label: 'Final', desc: 'Winner takes the PSL trophy', tone: 'qualified' },
];

export default async function PSLPage() {
  const [pslTeams, matches, tournament] = await Promise.all([
    fetchPSLTeams(),
    fetchMatches(),
    fetchTournaments({ id: 't1' }),
  ]);

  const live = matches.filter((m) => m.status === 'live');
  const upcoming = matches.filter((m) => m.status === 'upcoming').slice(0, 4);
  const pslOnly = matches.filter((m) => m.tournamentId === 't1');
  const pslLive = live.filter((m) => m.tournamentId === 't1');
  const pslUpcoming = upcoming.filter((m) => m.tournamentId === 't1');

  const topRun = [
    { name: 'Mohammad Rizwan', team: 'Multan Sultans', runs: 512 },
    { name: 'Fakhar Zaman', team: 'Lahore Qalandars', runs: 498 },
    { name: 'Shan Masood', team: 'Peshawar Zalmi', runs: 472 },
  ];
  const topWickets = [
    { name: 'Shaheen Afridi', team: 'Lahore Qalandars', wkts: 18 },
    { name: 'Hasan Ali', team: 'Peshawar Zalmi', wkts: 16 },
    { name: 'Haris Rauf', team: 'Lahore Qalandars', wkts: 14 },
  ];

  const pointsRows = [...pslTeams]
    .sort((a, b) => b.points - a.points || parseFloat(b.nrr) - parseFloat(a.nrr))
    .map((t) => ({
      teamId: t.id,
      name: t.name,
      played: t.matches,
      won: t.wins,
      lost: t.losses,
      points: t.points,
      nrr: t.nrr,
      status: t.status,
    }));

  const recentResults = pslOnly
    .filter((m) => m.status === 'completed')
    .slice(0, 4);

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden">
        <div
          className="hero-grad absolute inset-0"
        />
        <div className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-gold/10 blur-3xl" />

        <div className="hero-content relative mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-2xl">
              <div className="mb-4 flex items-center gap-2">
                <Crown size={18} className="text-gold" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                  Season 11 • 2026
                </span>
              </div>
              <h1 className="hero-title text-4xl font-black tracking-tight sm:text-5xl">
                PAKISTAN <span className="text-accent">SUPER LEAGUE</span>
              </h1>
              <p className="hero-lead mt-4 max-w-xl text-sm leading-relaxed sm:text-base">
                {tournament?.description ||
                  'The Pakistan Super League — six franchises, one mission. Follow the PSL with live scores, fixtures, tables and player stats.'}
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Badge tone="live">{tournament?.status || 'Ongoing'}</Badge>
                <Badge tone="neutral" data-hero-neutral>{tournament?.format || 'T20'} • {tournament?.totalMatches} matches</Badge>
                <Badge tone="neutral" data-hero-neutral>Played {tournament?.matchesPlayed ?? '—'}</Badge>
              </div>
            </div>
            {tournament && (
              <div className="text-center">
                <p className="font-mono text-5xl font-black tabular-nums text-accent">
                  {tournament.matchesPlayed}
                </p>
                <p className="mt-1 text-xs uppercase tracking-widest text-slate-300">Matches Played</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {pslLive.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <SectionHeader title="Live PSL Action" subtitle="In Progress" icon="zap" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {pslLive.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <SectionHeader
          title="The Six Franchises"
          subtitle="PSL Teams"
          icon="trophy"
          to="/teams"
          actionLabel="All teams"
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pslTeams.map((t) => (
            <TeamCard key={t.id} team={t} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionHeader
              title="Points Table"
              subtitle="Standings"
              to="/points-table"
              actionLabel="Full table"
            />
            <PointsTable rows={pointsRows} favoriteTeamId="lahore-qalandars" />

            {recentResults.length > 0 && (
              <div className="mt-6 overflow-x-auto rounded-2xl bg-card ring-1 ring-lborder">
                <div className="border-b border-lborder px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-stext">
                  Recent Results
                </div>
                <div className="divide-y divide-lborder/60">
                  {recentResults.map((m) => (
                    <Link
                      key={m.id}
                      href={`/matches/${m.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-elevated/50"
                    >
                      <div className="flex items-center gap-3 text-sm">
                        <TeamLogo teamId={m.teams.home.teamId} size="xs" link={false} />
                        <span className="text-stext">{m.teams.home.code}</span>
                        <span className="text-stext">vs</span>
                        <TeamLogo teamId={m.teams.away.teamId} size="xs" link={false} />
                        <span className="text-stext">{m.teams.away.code}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-gold">{m.result}</p>
                        <p className="text-[11px] text-stext">{m.date}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <SectionHeader title="Playoff Race" subtitle="Road to the Final" />
            <div className="space-y-3">
              {qualifierSteps.map((step, i) => (
                <div
                  key={step.label}
                  className="flex items-start gap-3 rounded-2xl bg-card p-4 ring-1 ring-lborder"
                >
                  <span
                    className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-xs font-black ${
                      step.tone === 'qualified'
                        ? 'bg-accent2/15 text-accent2'
                        : 'bg-accent/15 text-accent'
                    }`}
                  >
                    Q{i + 1}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-mtext">{step.label}</p>
                    <p className="text-xs text-stext">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <SectionHeader title="Top Performers" subtitle="This Season" icon="zap" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <LeaderCard title="Most Runs" rows={topRun} valueKey="runs" accent="accent2" />
          <LeaderCard title="Most Wickets" rows={topWickets} valueKey="wkts" accent="accent" />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <SectionHeader
          title="PSL Upcoming Fixtures"
          subtitle="Schedule"
          to="/matches"
          actionLabel="Match centre"
        />
        {pslUpcoming.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {pslUpcoming.map((m) => (
              <MatchCard key={m.id} match={m} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-card px-6 py-8 text-center text-stext ring-1 ring-lborder">
            No upcoming PSL fixtures scheduled yet.
          </div>
        )}
      </section>
    </div>
  );
}

function LeaderCard({ title, rows, valueKey, accent }) {
  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
      <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-stext">
        <MapPin size={13} /> {title}
      </p>
      <div className="space-y-2.5">
        {rows.map((r, i) => (
          <div key={r.name} className="flex items-center gap-3">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-elevated font-mono text-xs font-bold text-stext">
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-mtext">{r.name}</p>
              <p className="truncate text-xs text-stext">{r.team}</p>
            </div>
            <span className={`font-mono text-lg font-bold tabular-nums ${accent === 'accent2' ? 'text-accent2' : 'text-accent'}`}>
              {r[valueKey]}
            </span>
          </div>
        ))}
      </div>
      <Link href="/stats" className="mt-4 flex items-center gap-1 text-sm font-semibold text-accent transition-colors hover:text-accent2">
        Full statistics <ArrowRight size={14} />
      </Link>
    </div>
  );
}
