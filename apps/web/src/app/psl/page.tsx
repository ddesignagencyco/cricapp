import SectionHeader from '../../components/SectionHeader';
import Badge from '../../components/Badge';
import PointsTable from '../../components/PointsTable';
import TeamLogo from '../../components/TeamLogo';
import StatsBoard from '../../components/boards/StatsBoard';
import PslSeasonFilter from '../../components/PslSeasonFilter';
import PslFixturesTable from '../../components/PslFixturesTable';
import DummyAd from '../../components/advertisements/DummyAd';
import PslSquadsBoard from '../../components/PslSquadsBoard';
import { formatScheduled } from '../../utils/helpers';
import ErrorState from '../../components/ErrorState';
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

  const seasons = await fetchPslSeasons().catch(() => null);
  if (!seasons) {
    return (
      <div className="min-h-screen">
        <section className="relative overflow-hidden">
          <div className="hero-grad absolute inset-0" />
          <div className="hero-content relative mx-auto max-w-7xl px-4 py-14 sm:px-6">
            <div className="max-w-2xl">
              <div className="mb-4 flex items-center gap-2">
                <span className="hero-kicker text-xs font-semibold capitalize tracking-wide">
                  Pakistan Super League
                </span>
              </div>
              <h1 className="hero-title text-4xl font-black tracking-tight sm:text-5xl">
                PAKISTAN <span className="hero-highlight">SUPER LEAGUE</span>
              </h1>
              <p className="hero-lead mt-4 max-w-xl text-sm leading-relaxed sm:text-base">
                Six franchises, one mission. Follow the PSL with fixtures, tables and player stats.
              </p>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <ErrorState
            title="Server unavailable"
            message="Can't reach the API, so PSL seasons, tables and fixtures aren't listed. Start the backend or try again."
          />
        </section>
      </div>
    );
  }

  const latestSeason = seasons[seasons.length - 1];
  const currentSeason = selectedSeason
    ? seasons.find((s) => s.id === selectedSeason) || latestSeason
    : latestSeason;
  const activeSeasonId = currentSeason?.id || '';
  const seasonLabel = currentSeason?.name || currentSeason?.year || '';

  const seasonParam = activeSeasonId ? { season: activeSeasonId } : {};

  const [standingsResult, leadersResult, scheduleResult, squadsResult] = await Promise.allSettled([
    fetchPslStandings(seasonParam),
    fetchPslLeaders(seasonParam),
    fetchPslSchedule(seasonParam),
    fetchPslSquads(seasonParam),
  ]);

  const pslLoadError = [standingsResult, leadersResult, scheduleResult, squadsResult].every(
    (result) => result.status === 'rejected',
  );
  if (pslLoadError) {
    return (
      <div className="min-h-screen">
        <section className="relative overflow-hidden">
          <div className="hero-grad absolute inset-0" />
          <div className="hero-content relative mx-auto max-w-7xl px-4 py-14 sm:px-6">
            <div className="max-w-2xl">
              <h1 className="hero-title text-4xl font-black tracking-tight sm:text-5xl">
                PAKISTAN <span className="hero-highlight">SUPER LEAGUE</span>
              </h1>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
          <ErrorState
            title="Server unavailable"
            message="Can't reach the API, so PSL tables and fixtures aren't listed. Start the backend or try again."
          />
        </section>
      </div>
    );
  }

  const standings = standingsResult.status === 'fulfilled' ? standingsResult.value : [];
  const leaders = leadersResult.status === 'fulfilled' ? leadersResult.value : [];
  const schedule = scheduleResult.status === 'fulfilled' ? scheduleResult.value : [];
  const squads = squadsResult.status === 'fulfilled' ? squadsResult.value : [];

  const pointsRows = [...(standings || [])].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

  const playoffs = (schedule || []).filter((m) => m.round && roundLabels[m.round]);
  const regular = (schedule || []).filter((m) => !m.round);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="hero-grad absolute inset-0" />
        <div className="hero-content relative mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <div className="max-w-2xl">
            <div className="mb-4 flex items-center gap-2">
              <span className="hero-kicker text-xs font-semibold capitalize tracking-wide">
                {seasonLabel || 'Pakistan Super League'}
              </span>
            </div>
            <h1 className="hero-title text-4xl font-black tracking-tight sm:text-5xl">
              PAKISTAN <span className="hero-highlight">SUPER LEAGUE</span>
            </h1>
            <p className="hero-lead mt-4 max-w-xl text-sm leading-relaxed sm:text-base">
              Six franchises, one mission. Follow the PSL with fixtures, tables and player stats.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2.5">
              <span className="hero-chip">T20</span>
              {seasonLabel && <span className="hero-chip">{seasonLabel}</span>}
              {pointsRows.length > 0 && (
                <span className="hero-chip hero-chip--accent">{pointsRows.length} Teams</span>
              )}
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

      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6">
        <DummyAd size="leaderboard" placement="psl-after-intro" />
      </section>

      {/* Full Leaders / Stats */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <SectionHeader
          title="Statistics"
          subtitle={seasonLabel ? `${seasonLabel} Leaders` : 'Season leaders'}
          icon="trendingup"
        />
        <StatsBoard leaders={leaders || []} />
      </section>

      {/* Squads */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <SectionHeader
          title="Squads"
          subtitle={seasonLabel ? `${seasonLabel} rosters` : 'Franchise rosters'}
          icon="users"
        />
        <PslSquadsBoard squads={squads || []} />
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
                  <p className="px-8 text-xs font-semibold text-muted-foreground">VS</p>
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
          regular.length >= 8 ? (
            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="min-w-0">
                <PslFixturesTable matches={regular} />
              </div>
              <div className="hidden w-[300px] shrink-0 lg:block">
                <DummyAd size="half-page" placement="psl-half-page" />
              </div>
            </div>
          ) : (
            <PslFixturesTable matches={regular} />
          )
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
