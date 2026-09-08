import Link from 'next/link';
import SectionHeader from '../../components/SectionHeader';
import Badge from '../../components/Badge';
import PointsTable from '../../components/PointsTable';
import TeamLogo from '../../components/TeamLogo';
import { PSLLeaderCard } from '../../components/PSLLeaderCard';
import { PSLHeroBadge } from '../../components/PSLHeroBadge';
import { formatScheduled } from '../../utils/helpers';
import { fetchPslStandings } from '../../services/psl';
import { fetchPslLeaders } from '../../services/psl';
import { fetchPslSchedule } from '../../services/psl';
import { fetchPslSquads } from '../../services/psl';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'PSL',
  description: 'Pakistan Super League — live scores, fixtures, tables and player stats.',
};

const roundLabels: Record<string, string> = {
  qualifier_1: 'Qualifier',
  eliminator: 'Eliminator 1',
  qualifier_2: 'Eliminator 2',
  final: 'Final',
};

export default async function PSLPage() {
  const [standings, leaders, schedule, squads] = await Promise.all([
    fetchPslStandings(),
    fetchPslLeaders(),
    fetchPslSchedule(),
    fetchPslSquads(),
  ]);

  const pointsRows = [...(standings || [])].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

  const topRuns = (leaders || []).find((g) => g.stat === 'top_runs')?.entries || [];
  const topRunsList = topRuns.slice(0, 3);
  const topWicketsList = ((leaders || []).find((g) => g.stat === 'top_wickets')?.entries || []).slice(0, 3);

  const playoffs = (schedule || []).filter((m) => m.round && roundLabels[m.round]);
  const regular = (schedule || []).filter((m) => !m.round);

  return (
    <div className="min-h-screen">
      <section className="relative overflow-hidden">
        <div className="hero-grad absolute inset-0" />
        <div className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-gold/10 blur-3xl" />

        <div className="hero-content relative mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="max-w-2xl">
            <PSLHeroBadge />
            <h1 className="hero-title text-4xl font-black tracking-tight sm:text-5xl">
              PAKISTAN <span className="text-accent">SUPER LEAGUE</span>
            </h1>
            <p className="hero-lead mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Six franchises, one mission. Follow the PSL with fixtures, tables and player stats.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Badge tone="live">Ongoing</Badge>
              <Badge tone="neutral">T20</Badge>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SectionHeader title="Points Table" subtitle="Standings" icon="trophy" to="/points-table" actionLabel="Full table" />
            <PointsTable rows={pointsRows} />
          </div>

          <div>
            <SectionHeader title="Top Performers" subtitle="This Season" icon="zap" to="/stats" actionLabel="Full stats" />
            <PSLLeaderCard title="Most Runs" rows={topRunsList} accent="accent2" />
            <div className="mt-4">
              <PSLLeaderCard title="Most Wickets" rows={topWicketsList} accent="accent" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <SectionHeader title="The Franchises" subtitle="PSL Teams" icon="users" to="/teams" actionLabel="All teams" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {squads.map((s) => (
            <Link
              key={s.teamId}
              href={`/teams/${s.teamId}`}
              className="group flex flex-col items-center justify-center rounded-2xl bg-card p-6 text-center ring-1 ring-lborder transition-all duration-300 hover:-translate-y-1 hover:bg-elevated hover:ring-accent/30 hover:shadow-lg"
            >
              <TeamLogo teamId={s.teamId} name={s.teamName} code={s.teamAbbr} size="lg" link={false} />
              <h3 className="mt-4 text-base font-bold text-mtext group-hover:text-accent transition-colors">{s.teamName}</h3>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-stext">
                {s.teamAbbr} • {s.players?.length || 0} players
              </p>
            </Link>
          ))}
        </div>
      </section>

      {playoffs.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <SectionHeader title="Playoff Race" subtitle="Road to the Final" icon="video" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {playoffs.map((m) => (
              <div key={m.matchId} className="rounded-2xl bg-card p-5 ring-1 ring-lborder shadow-sm">
                <Badge tone="qualified">{roundLabels[m.round] || m.round}</Badge>
                <div className="mt-4 flex flex-col gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <TeamLogo code={m.homeTeamAbbr} size="xs" link={false} />
                    <p className="font-semibold text-mtext truncate">{m.homeTeamName}</p>
                  </div>
                  <p className="text-[10px] font-black italic text-stext/50 px-8">VS</p>
                  <div className="flex items-center gap-2">
                    <TeamLogo code={m.awayTeamAbbr} size="xs" link={false} />
                    <p className="font-semibold text-mtext truncate">{m.awayTeamName}</p>
                  </div>
                </div>
                <p className="mt-4 border-t border-lborder/50 pt-3 text-xs font-medium text-stext">
                  {formatScheduled(m.scheduled).date}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <SectionHeader title="Fixtures" subtitle="Schedule" icon="calendar" />
        {regular.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {regular.slice(0, 20).map((m) => (
              <div key={m.matchId} className="group flex items-center justify-between gap-3 rounded-2xl bg-card px-5 py-4 ring-1 ring-lborder transition-all hover:bg-elevated hover:shadow-md">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <TeamLogo code={m.homeTeamAbbr} size="xs" link={false} />
                    <span className="font-bold text-mtext">{m.homeTeamAbbr}</span>
                  </div>
                  <span className="text-[10px] font-black italic text-stext/50">VS</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-mtext">{m.awayTeamAbbr}</span>
                    <TeamLogo code={m.awayTeamAbbr} size="xs" link={false} />
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-accent/80">{m.status}</p>
                  <p className="mt-0.5 text-xs font-medium text-stext">{formatScheduled(m.scheduled).date}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-card px-6 py-8 text-center text-stext ring-1 ring-lborder">
            No fixtures scheduled yet.
          </div>
        )}
      </section>
    </div>
  );
}
