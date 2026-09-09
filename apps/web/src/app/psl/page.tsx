import Link from 'next/link';
import SectionHeader from '../../components/SectionHeader';
import Badge from '../../components/Badge';
import PointsTable from '../../components/PointsTable';
import TeamLogo from '../../components/TeamLogo';
import StatsBoard from '../../components/boards/StatsBoard';
import PslSeasonFilter from '../../components/PslSeasonFilter';
import PslFixturesTable from '../../components/PslFixturesTable';
import { formatScheduled } from '../../utils/helpers';
import { fetchPslStandings, fetchPslLeaders, fetchPslSchedule, fetchPslSquads, fetchPslSeasons } from '../../services/psl';

export const revalidate = 60;

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const params = await searchParams;
  const season = params.season || '';
  return {
    title: season ? `PSL Season ${season}` : 'PSL',
    description: 'Pakistan Super League — live scores, fixtures, tables and player stats.',
  };
}

const roundLabels: Record<string, string> = {
  qualifier_1: 'Qualifier',
  eliminator: 'Eliminator 1',
  qualifier_2: 'Eliminator 2',
  final: 'Final',
};

export default async function PSLPage({ searchParams }: { searchParams: Promise<{ season?: string | string[] }> }) {
  const params = await searchParams;
  const rawSeason = Array.isArray(params.season) ? params.season[params.season.length - 1] : params.season;
  const selectedSeason = rawSeason || '';

  const seasons = await fetchPslSeasons();
  const latestSeason = seasons[seasons.length - 1];
  const currentSeason = selectedSeason
    ? seasons.find((s) => s.id === selectedSeason) || latestSeason
    : latestSeason;
  const activeSeasonId = currentSeason?.id || '';
  const seasonLabel = currentSeason?.name || currentSeason?.year || '';

  const seasonParam = activeSeasonId ? { season: activeSeasonId } : {};

  const [standings, leaders, schedule, squads] = await Promise.all([
    fetchPslStandings(seasonParam),
    fetchPslLeaders(seasonParam),
    fetchPslSchedule(seasonParam),
    fetchPslSquads(seasonParam),
  ]);

  const pointsRows = [...(standings || [])].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

  const playoffs = (schedule || []).filter((m) => m.round && roundLabels[m.round]);
  const regular = (schedule || []).filter((m) => !m.round);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="hero-grad absolute inset-0" />
        <div className="pointer-events-none absolute -right-20 top-0 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 bottom-0 h-80 w-80 rounded-full bg-gold/10 blur-3xl" />
        <div className="hero-content relative mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="max-w-2xl">
            <div className="mb-4 flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-300">
                {seasonLabel || 'Pakistan Super League'}
              </span>
            </div>
            <h1 className="hero-title text-4xl font-black tracking-tight sm:text-5xl">
              PAKISTAN <span className="text-accent">SUPER LEAGUE</span>
            </h1>
            <p className="hero-lead mt-4 max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
              Six franchises, one mission. Follow the PSL with fixtures, tables and player stats.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Badge tone="neutral">T20</Badge>
              {seasonLabel && <Badge tone="neutral">{seasonLabel}</Badge>}
              {pointsRows.length > 0 && <Badge tone="live">{pointsRows.length} Teams</Badge>}
            </div>
          </div>
        </div>
      </section>

      {/* Season Filter */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <PslSeasonFilter seasons={seasons} activeSeasonId={activeSeasonId} />
      </section>

      {/* Standings */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <SectionHeader title="Points Table" subtitle={seasonLabel ? `${seasonLabel} Standings` : 'Standings'} icon="trophy" />
        <PointsTable rows={pointsRows} />
      </section>

      {/* Full Leaders / Stats */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <StatsBoard leaders={leaders || []} season={seasonLabel} />
      </section>

      {/* Franchises */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <SectionHeader title="The Franchises" subtitle="PSL Teams" icon="users" to="/teams" actionLabel="All teams" />
        {squads.length > 0 ? (
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
        ) : (
          <div className="rounded-2xl bg-card px-6 py-10 text-center ring-1 ring-lborder">
            <p className="text-sm font-semibold text-mtext">No team data available</p>
            <p className="mt-1 text-xs text-stext">Squads will appear once rosters are confirmed.</p>
          </div>
        )}
      </section>

      {/* Playoffs */}
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

      {/* Fixtures */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <SectionHeader title="Fixtures" subtitle="Schedule" icon="calendar" />
        {regular.length > 0 ? (
          <PslFixturesTable matches={regular} />
        ) : (
          <div className="rounded-2xl bg-card px-6 py-10 text-center ring-1 ring-lborder">
            <p className="text-sm font-semibold text-mtext">No fixtures scheduled</p>
            <p className="mt-1 text-xs text-stext">Schedule will be announced before the season begins.</p>
          </div>
        )}
      </section>
    </div>
  );
}
