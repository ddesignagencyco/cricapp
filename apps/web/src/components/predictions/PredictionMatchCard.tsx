import Link from 'next/link';
import { BarChart3 } from 'lucide-react';
import TeamLogo from '../TeamLogo';
import Badge from '../Badge';
import LiveIndicator from '../LiveIndicator';
import WinProbabilityBar from './WinProbabilityBar';
import {
  asPercent,
  featuredRun,
  isNil,
  matchSides,
  matchStatusLabel,
  momentumLine,
  predictionSituation,
  publicTossFact,
  publicVenueWeatherFact,
  publicWhyChanged,
  stageLabel,
  usefulScoreRange,
} from '../../lib/predictions';
import { formatDate, formatScheduled } from '../../utils/helpers';
import type { Match } from '../../types';
import type { MatchPredictions, PredictionChartPoint } from '../../types/predictions';

interface Props {
  match: Match;
  predictions: MatchPredictions | null;
  chartPoints?: PredictionChartPoint[];
}

function extraText(match: Match, key: string): string {
  const value = (match as Record<string, unknown>)[key];
  return typeof value === 'string' ? value.trim() : '';
}

function RingMeter({ label, value }: { label: string; value: number }) {
  const pct = Math.max(0, Math.min(100, Number(value) * 100));
  const radius = 15.5;
  const circ = 2 * Math.PI * radius;
  return (
    <div className="text-center">
      <div className="relative mx-auto h-14 w-14">
        <svg viewBox="0 0 36 36" className="-rotate-90" aria-hidden="true">
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            stroke="var(--color-lborder)"
            strokeWidth="2.4"
          />
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct / 100)}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center font-mono text-[11px] font-black tabular-nums text-mtext">
          {asPercent(value)}
        </span>
      </div>
      <p className="mt-1.5 truncate text-[10px] font-semibold tracking-wide text-stext">{label}</p>
    </div>
  );
}

export default function PredictionMatchCard({ match, predictions }: Props) {
  const matchId = String(match.matchId || match.id || '');
  const sides = matchSides(match);
  const run = featuredRun(predictions);
  const situation = predictionSituation(match, run, sides);
  const { date, time } = formatScheduled(match.scheduled);
  const when = [date ? formatDate(date) : '', time].filter(Boolean).join(' · ');
  const status = String(match.status || '').toLowerCase();
  const href = run ? `/predictions/${matchId}` : `/matches/${matchId}`;
  const toss = publicTossFact(run, match, sides);
  const ground = publicVenueWeatherFact(run, match);
  const why = publicWhyChanged(run, sides);
  const format = extraText(match, 'format');
  const score = extraText(match, 'displayScore');
  const phase = matchStatusLabel(situation.matchStatus || extraText(match, 'matchStatus'));
  const range = run?.scoreRange;
  const confidence = run && !isNil(run.confidence) ? Number(run.confidence) : null;
  const lean = momentumLine(run?.momentum, sides);
  const live = run?.stage === 'live' || status === 'live';
  const insight = [situation.needLine, lean, why].filter(Boolean).join(' ');
  const showPhase = Boolean(phase && phase !== 'Upcoming' && phase !== 'Live');
  const inningsLabel =
    situation.inning === 1 ? '1st innings' : situation.inning === 2 ? '2nd innings' : '';
  const overLabel = situation.modelOver !== null ? `Over ${situation.modelOver}` : '';
  const scoreMeta = [inningsLabel || (showPhase ? phase : ''), overLabel].filter(Boolean).join(' · ');
  const meters = [
    confidence !== null && confidence > 0 ? { label: 'Confidence', value: confidence } : null,
  ].filter((row): row is { label: string; value: number } => row !== null);
  const factsAll = [
    situation.requiredRuns !== null && situation.requiredRuns > 0
      ? { label: situation.inning === 2 ? 'Target' : 'Need', value: String(situation.requiredRuns) }
      : null,
    usefulScoreRange(range, score ? Number(score.split('/')[0]) : null)
      ? { label: 'Score band', value: `${range?.low}–${range?.high}` }
      : null,
    toss ? { label: 'Toss', value: toss } : null,
    when ? { label: 'When', value: when } : null,
    format ? { label: 'Format', value: format } : null,
    ground ? { label: 'Venue', value: ground } : null,
  ].filter((row): row is { label: string; value: string } => row !== null);
  const facts = factsAll.slice(0, 4);

  return (
    <Link
      href={href}
      className="prediction-card flex h-full flex-col rounded-md border border-lborder bg-card p-4 sm:p-5"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-bold uppercase tracking-[0.14em] text-stext">
          {String(match.tournament || 'Match')}
        </p>
        {live ? (
          <LiveIndicator label={run ? stageLabel(run.stage) : 'Live'} />
        ) : (
          <Badge tone="primary">{run ? stageLabel(run.stage) : 'Upcoming'}</Badge>
        )}
      </div>

      <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex min-w-0 items-center gap-2.5">
          <TeamLogo code={sides.homeCode} name={sides.homeName} size="md" link={false} />
          <p className="truncate text-sm font-semibold text-mtext">{sides.homeName}</p>
        </div>
        <span className="text-[10px] font-bold uppercase tracking-widest text-stext">vs</span>
        <div className="flex min-w-0 items-center justify-end gap-2.5 text-right">
          <p className="truncate text-sm font-semibold text-mtext">{sides.awayName}</p>
          <TeamLogo code={sides.awayCode} name={sides.awayName} size="md" link={false} />
        </div>
      </div>

      {situation.scoreLine ? (
        <div className="mb-4">
          <p className="truncate text-xl font-black tabular-nums tracking-tight text-mtext">
            {situation.scoreLine}
          </p>
          {scoreMeta ? (
            <p className="mt-1 text-xs font-medium text-stext">{scoreMeta}</p>
          ) : null}
        </div>
      ) : null}

      {run ? (
        <div>
          <WinProbabilityBar
            homeLabel={sides.homeCode}
            awayLabel={sides.awayCode}
            homeWinProb={run.homeWinProb}
            awayWinProb={run.awayWinProb}
            compact
          />
          {meters.length > 0 ? (
            <div
              className={`mt-5 grid justify-items-center gap-4 ${
                meters.length === 1 ? 'grid-cols-1' : meters.length === 2 ? 'grid-cols-2' : 'grid-cols-3'
              }`}
            >
              {meters.map((meter) => (
                <RingMeter key={meter.label} label={meter.label} value={meter.value} />
              ))}
            </div>
          ) : null}
          {insight ? (
            <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-surface-muted px-3 py-2.5">
              <BarChart3 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" strokeWidth={2.25} />
              <p className="line-clamp-1 text-xs text-stext">{insight}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-stext">Chance of winning not ready yet</p>
      )}

      {facts.length > 0 ? (
        <div className="mt-auto grid grid-cols-2 gap-x-5 gap-y-3 border-t border-lborder/80 pt-5">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-stext">{fact.label}</p>
              <p className="mt-0.5 truncate text-xs font-semibold text-mtext" title={fact.value}>
                {fact.value}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-auto" />
      )}
    </Link>
  );
}
