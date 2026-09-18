import Link from 'next/link';
import Badge from '../Badge';
import TeamLogo from '../TeamLogo';
import SectionHeader from '../SectionHeader';
import WinProbabilityBar from './WinProbabilityBar';
import {
  asPercent,
  explanationReasons,
  favoriteLabel,
  matchSides,
  stageLabel,
} from '../../lib/predictions';
import type { Match } from '../../types';
import type { PredictionRun } from '../../types/predictions';

export interface HomePredictionPick {
  match: Match;
  run: PredictionRun;
}

function matchIdOf(match: Match): string {
  return String(match.matchId || match.id || '');
}

function lean(run: PredictionRun): number {
  return Math.abs(Number(run.homeWinProb) - Number(run.awayWinProb));
}

function pickFeatured(picks: HomePredictionPick[]): HomePredictionPick {
  const live = picks.filter((pick) => pick.run.stage === 'live' || pick.match.status === 'live');
  const pool = live.length > 0 ? live : picks;
  return [...pool].sort((a, b) => lean(b.run) - lean(a.run))[0] ?? picks[0];
}

export default function HomePredictions({ picks }: { picks: HomePredictionPick[] }) {
  if (picks.length === 0) return null;

  const featured = pickFeatured(picks);
  const featuredId = matchIdOf(featured.match);
  const others = picks.filter((pick) => matchIdOf(pick.match) !== featuredId).slice(0, 3);
  const sides = matchSides(featured.match);
  const favorite = favoriteLabel(featured.run, sides);
  const reason = explanationReasons(featured.explanation)[0] || '';
  const even = lean(featured.run) < 0.04;
  const callLabel = featured.run.stage === 'live' || featured.match.status === 'live' ? 'Live lean' : 'Clearest call';

  return (
    <section className="mx-auto w-full max-w-7xl px-4 sm:px-6">
      <SectionHeader
        title="Model desk"
        subtitle="Who the numbers favour right now — not a scorecard"
        icon="sparkles"
        to="/predictions"
        actionLabel="All predictions"
      />

      <div className={`grid grid-cols-1 gap-3 ${others.length > 0 ? 'lg:grid-cols-[1.4fr_0.8fr]' : ''}`}>
        <Link
          href={`/predictions/${featuredId}`}
          className="group overflow-hidden rounded-3xl border border-accent/25 bg-card p-5 sm:p-6"
        >
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="gold">{callLabel}</Badge>
              <Badge tone={featured.run.stage === 'live' ? 'live' : 'primary'}>{stageLabel(featured.run.stage)}</Badge>
            </div>
            <p className="truncate text-xs font-bold uppercase tracking-widest text-stext">
              {String(featured.match.tournament || 'Match')}
            </p>
          </div>

          <div className="mb-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex min-w-0 items-center gap-2.5">
              <TeamLogo code={sides.homeCode} name={sides.homeName} size="md" link={false} />
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-stext">{sides.homeCode}</p>
                <p className="truncate text-sm font-black text-mtext sm:text-base">{sides.homeName}</p>
              </div>
            </div>
            <span className="text-[11px] font-black text-stext">VS</span>
            <div className="flex min-w-0 items-center justify-end gap-2.5 text-right">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wider text-stext">{sides.awayCode}</p>
                <p className="truncate text-sm font-black text-mtext sm:text-base">{sides.awayName}</p>
              </div>
              <TeamLogo code={sides.awayCode} name={sides.awayName} size="md" link={false} />
            </div>
          </div>

          <WinProbabilityBar
            homeLabel={sides.homeCode}
            awayLabel={sides.awayCode}
            homeWinProb={featured.run.homeWinProb}
            awayWinProb={featured.run.awayWinProb}
          />

          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-lborder/70 pt-4">
            <p className="text-sm font-bold text-mtext">
              {even ? 'Too close to call' : `Model favourite · ${favorite}`}
            </p>
            {Number.isFinite(Number(featured.run.confidence)) && Number(featured.run.confidence) > 0 && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-stext">
                Confidence {asPercent(featured.run.confidence)}
              </span>
            )}
          </div>
          {reason && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-stext">{reason}</p>}
        </Link>

        {others.length > 0 && (
          <div className="flex flex-col gap-2.5">
            <p className="text-[11px] font-bold uppercase tracking-widest text-stext">Also on the board</p>
            {others.map((pick) => {
              const id = matchIdOf(pick.match);
              const nextSides = matchSides(pick.match);
              const nextFavorite = favoriteLabel(pick.run, nextSides);
              const tight = lean(pick.run) < 0.08;
              return (
                <Link
                  key={id}
                  href={`/predictions/${id}`}
                  className="rounded-2xl border border-lborder bg-card px-4 py-3.5 transition-colors hover:border-accent/40"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] font-bold uppercase tracking-wider text-stext">
                      {String(pick.match.tournament || 'Match')}
                    </p>
                    <Badge tone={tight ? 'warning' : pick.run.stage === 'live' ? 'live' : 'neutral'}>
                      {tight ? 'Toss-up' : stageLabel(pick.run.stage)}
                    </Badge>
                  </div>
                  <p className="truncate text-sm font-bold text-mtext">
                    {nextSides.homeCode} vs {nextSides.awayCode}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-stext">
                    {nextFavorite} {asPercent(Math.max(pick.run.homeWinProb, pick.run.awayWinProb))}
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
