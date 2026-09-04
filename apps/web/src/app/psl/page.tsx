import Link from 'next/link';
import { ArrowRight, Crown, Trophy } from 'lucide-react';
import SectionHeader from '../../components/SectionHeader';
import Badge from '../../components/Badge';
import PointsTable from '../../components/PointsTable';
import { getInitials, formatScheduled } from '../../utils/helpers';
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
            <div className="mb-4 flex items-center gap-2">
              <Crown size={18} className="text-gold" />
              <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                Season • 
              </span>
            </div>
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
            <SectionHeader title="Points Table" subtitle="Standings" to="/points-table" actionLabel="Full table" />
            <PointsTable rows={pointsRows} />
          </div>

          <div>
            <SectionHeader title="Top Performers" subtitle="This Season" icon="zap" to="/stats" actionLabel="Full stats" />
            <LeaderCard title="Most Runs" rows={topRunsList} accent="accent2" />
            <div className="mt-4">
              <LeaderCard title="Most Wickets" rows={topWicketsList} accent="accent" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <SectionHeader title="The Franchises" subtitle="PSL Teams" icon="trophy" to="/teams" actionLabel="All teams" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {squads.map((s) => (
            <Link
              key={s.teamId}
              href={`/teams/${s.teamId}`}
              className="group rounded-2xl bg-card p-5 ring-1 ring-lborder transition-all duration-300 hover:-translate-y-0.5 hover:bg-elevated hover:ring-accent/30"
            >
              <span className="grid h-12 w-12 place-items-center rounded-full border-2 border-accent bg-primary text-sm font-extrabold text-accent">
                {getInitials(s.teamName || s.teamAbbr)}
              </span>
              <h3 className="mt-3 text-base font-bold text-mtext">{s.teamName}</h3>
              <p className="text-xs font-semibold uppercase tracking-wider text-stext">
                {s.teamAbbr} • {s.players?.length || 0} players
              </p>
            </Link>
          ))}
        </div>
      </section>

      {playoffs.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <SectionHeader title="Playoff Race" subtitle="Road to the Final" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {playoffs.map((m) => (
              <div key={m.matchId} className="rounded-2xl bg-card p-4 ring-1 ring-lborder">
                <Badge tone="qualified">{roundLabels[m.round] || m.round}</Badge>
                <div className="mt-3 space-y-1.5 text-sm">
                  <p className="font-semibold text-mtext">{m.homeTeamName}</p>
                  <p className="text-stext">vs</p>
                  <p className="font-semibold text-mtext">{m.awayTeamName}</p>
                </div>
                <p className="mt-3 text-[11px] text-stext">{formatScheduled(m.scheduled).date}</p>
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
              <div key={m.matchId} className="flex items-center justify-between gap-3 rounded-2xl bg-card px-4 py-3 ring-1 ring-lborder">
                <div className="flex items-center gap-3 text-sm">
                  <span className="font-semibold text-mtext">{m.homeTeamAbbr}</span>
                  <span className="text-stext">vs</span>
                  <span className="font-semibold text-mtext">{m.awayTeamAbbr}</span>
                </div>
                <div className="text-right">
                  <p className="text-[11px] uppercase tracking-wider text-stext">{m.status}</p>
                  <p className="text-[11px] text-stext">{formatScheduled(m.scheduled).date}</p>
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

function LeaderCard({ title, rows, accent }: { title: string; rows: { playerId: string; playerName: string; teamAbbr: string; value: string | number }[]; accent: string }) {
  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
      <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-stext">
        <Trophy size={13} /> {title}
      </p>
      {rows.length > 0 ? (
        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.playerId} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-mtext">{r.playerName}</p>
                <p className="truncate text-xs text-stext">{r.teamAbbr}</p>
              </div>
              <span className={`font-mono text-lg font-bold tabular-nums ${accent === 'accent2' ? 'text-accent2' : 'text-accent'}`}>
                {r.value}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-stext">No data yet.</p>
      )}
      <Link href="/stats" className="mt-4 flex items-center gap-1 text-sm font-semibold text-accent transition-colors hover:text-accent2">
        Full statistics <ArrowRight size={14} />
      </Link>
    </div>
  );
}
