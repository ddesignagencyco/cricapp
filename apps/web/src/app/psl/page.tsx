import SectionHeader from '../../components/SectionHeader';
import Badge from '../../components/Badge';
import PointsTable from '../../components/PointsTable';
import TeamLogo from '../../components/TeamLogo';
import StatsBoard from '../../components/boards/StatsBoard';
import PslSeasonFilter from '../../components/PslSeasonFilter';
import PslFixturesTable from '../../components/PslFixturesTable';
import AdSlot from '../../components/advertisements/AdSlot';
import PslSquadsBoard from '../../components/PslSquadsBoard';
import { formatScheduled } from '../../utils/helpers';
import ErrorState from '../../components/ErrorState';
import { fetchPslStandings, fetchPslLeaders, fetchPslSchedule, fetchPslSquads, fetchPslSeasons } from '../../services/psl';
import { fetchNews } from '../../services/news';
import { newsHref } from '../../utils/newsConstraints';
import RemoteImage from '../../components/RemoteImage';
import Link from 'next/link';
import Image from 'next/image';

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
          <Image src="/banner.jpg" alt="" aria-hidden="true" fill loading="eager" fetchPriority="high" sizes="100vw" quality={75} className="object-cover" />
          <div className="hero-scrim pointer-events-none absolute inset-0" />
          <div className="hero-content relative mx-auto max-w-site px-4 py-14 sm:px-6">
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
        <section className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <ErrorState
            title="We could not load this page"
            message="PSL seasons, tables and fixtures are not showing right now. Please try again in a moment."
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

  const [standingsResult, leadersResult, scheduleResult, squadsResult, newsResult] = await Promise.allSettled([
    fetchPslStandings(seasonParam),
    fetchPslLeaders(seasonParam),
    fetchPslSchedule(seasonParam),
    fetchPslSquads(seasonParam),
    fetchNews({ category: 'psl', limit: 6 }),
  ]);

  const pslLoadError = [standingsResult, leadersResult, scheduleResult, squadsResult].every(
    (result) => result.status === 'rejected',
  );
  if (pslLoadError) {
    return (
      <div className="min-h-screen">
        <section className="relative overflow-hidden">
          <Image src="/banner.jpg" alt="" aria-hidden="true" fill loading="eager" fetchPriority="high" sizes="100vw" quality={75} className="object-cover" />
          <div className="hero-scrim pointer-events-none absolute inset-0" />
          <div className="hero-content relative mx-auto max-w-site px-4 py-14 sm:px-6">
            <div className="max-w-2xl">
              <h1 className="hero-title text-4xl font-black tracking-tight sm:text-5xl">
                PAKISTAN <span className="hero-highlight">SUPER LEAGUE</span>
              </h1>
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <ErrorState
            title="We could not load this page"
            message="PSL tables and fixtures are not showing right now. Please try again in a moment."
          />
        </section>
      </div>
    );
  }

  const standings = standingsResult.status === 'fulfilled' ? standingsResult.value : [];
  const leaders = leadersResult.status === 'fulfilled' ? leadersResult.value : [];
  const schedule = scheduleResult.status === 'fulfilled' ? scheduleResult.value : [];
  const squads = squadsResult.status === 'fulfilled' ? squadsResult.value : [];
  const pslNews = newsResult.status === 'fulfilled' ? newsResult.value : [];

  const pointsRows = [...(standings || [])].sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));

  const playoffs = (schedule || []).filter((m) => m.round && roundLabels[m.round]);
  const regular = (schedule || []).filter((m) => !m.round);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <Image src="/banner.jpg" alt="" aria-hidden="true" fill loading="eager" fetchPriority="high" sizes="100vw" quality={75} className="object-cover" />
          <div className="hero-scrim pointer-events-none absolute inset-0" />
        <div className="hero-content relative mx-auto max-w-site px-4 py-14 sm:px-6">
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
      <section className="mx-auto max-w-site px-4 py-6 sm:px-6">
        <PslSeasonFilter seasons={seasons} activeSeasonId={activeSeasonId} />
      </section>

      {/* Standings */}
      <section id="table" className="mx-auto max-w-site px-4 py-10 sm:px-6">
        <SectionHeader title="Points Table" subtitle={seasonLabel ? `${seasonLabel} Standings` : 'Standings'} icon="trophy" />
        <PointsTable rows={pointsRows} />
      </section>

      <section className="mx-auto max-w-site px-4 pb-6 sm:px-6">
        <AdSlot placement="psl-after-intro" />
      </section>

      {/* Full Leaders / Stats */}
      <section id="stats" className="mx-auto max-w-site px-4 py-10 sm:px-6">
        <SectionHeader
          title="Statistics"
          subtitle={seasonLabel ? `${seasonLabel} Leaders` : 'Season leaders'}
          icon="trendingup"
        />
        <StatsBoard leaders={leaders || []} />
      </section>

      {/* Squads */}
      <section id="squads" className="mx-auto max-w-site px-4 py-10 sm:px-6">
        <SectionHeader
          title="Squads"
          subtitle={seasonLabel ? `${seasonLabel} rosters` : 'Franchise rosters'}
          icon="users"
        />
        <PslSquadsBoard squads={squads || []} />
      </section>

      {/* Playoffs */}
      {playoffs.length > 0 && (
        <section className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <SectionHeader title="Playoff Race" subtitle="Road to the Final" icon="video" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {playoffs.map((m) => (
              <div key={m.matchId} className="flex flex-col justify-between rounded-xl bg-card p-4 ring-1 ring-lborder shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="qualified">{roundLabels[m.round] || m.round}</Badge>
                  <span className="text-[11px] font-medium tabular-nums text-stext">
                    {formatScheduled(m.scheduled).date}
                  </span>
                </div>
                <div className="mt-3.5 space-y-2 text-sm">
                  <div className="flex items-center gap-2.5">
                    <TeamLogo code={m.homeTeamAbbr} size="xs" link={false} />
                    <p className="min-w-0 truncate font-semibold text-mtext">{m.homeTeamName}</p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <TeamLogo code={m.awayTeamAbbr} size="xs" link={false} />
                    <p className="min-w-0 truncate font-semibold text-mtext">{m.awayTeamName}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Fixtures */}
      <section id="fixtures" className="mx-auto max-w-site px-4 py-10 sm:px-6">
        <SectionHeader title="Fixtures" subtitle="Schedule" icon="calendar" />
        {regular.length > 0 ? (
          regular.length >= 8 ? (
            <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="min-w-0">
                <PslFixturesTable matches={regular} />
              </div>
              <div className="hidden w-[300px] shrink-0 justify-center lg:flex">
                <AdSlot placement="psl-half-page" />
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

      {pslNews.length > 0 && (
        <section id="news" className="mx-auto max-w-site px-4 py-10 sm:px-6">
          <SectionHeader title="PSL news" subtitle="Pakistan Super League stories" icon="newspaper" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pslNews.map((article) => (
              <Link
                key={article.id}
                href={newsHref(article)}
                className="news-card card-interactive group flex gap-3 overflow-hidden rounded-xl bg-card p-3 ring-1 ring-lborder"
              >
                <div className="news-card-media relative h-20 w-24 shrink-0 overflow-hidden rounded-lg bg-secondary">
                  {article.image ? (
                    <RemoteImage
                      src={article.image}
                      alt={article.title}
                      fill
                      sizes="96px"
                      fit="cover"
                      className="news-image object-cover object-top"
                    />
                  ) : (
                    <div className="h-full w-full media-fallback" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug text-mtext group-hover:text-accent">
                    {article.title}
                  </p>
                  {article.date ? <p className="mt-1 text-[11px] text-stext">{article.date}</p> : null}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
