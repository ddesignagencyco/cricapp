import Link from 'next/link';
import TeamLogo from '../TeamLogo';
import Badge from '../Badge';
import WinProbabilityBar from './WinProbabilityBar';
import {
  asPercent,
  featuredRun,
  inningsLooksOver,
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

function RingMeter({ label, value }: { label: string; value: number | null }) {
  const show = value !== null && Number(value) > 0;
  const pct = show ? Math.max(0, Math.min(100, Number(value) * 100)) : 0;
  const radius = 15;
  const circ = 2 * Math.PI * radius;
  return (
    <div className={show ? 'text-center' : 'invisible'} aria-hidden={!show}>
      <div className="relative mx-auto h-[3.25rem] w-[3.25rem]">
        <svg viewBox="0 0 36 36" className="-rotate-90" aria-hidden="true">
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            stroke="var(--color-lborder)"
            strokeWidth="3"
          />
          <circle
            cx="18"
            cy="18"
            r={radius}
            fill="none"
            stroke="var(--color-accent)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct / 100)}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center font-mono text-[11px] font-black tabular-nums text-mtext">
          {show ? asPercent(value) : '—'}
        </span>
      </div>
      <p className="mt-1.5 truncate text-[10px] font-semibold text-stext">{label}</p>
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
  const finished = inningsLooksOver(situation);
  const range = run?.scoreRange;
  const confidence = run && !isNil(run.confidence) ? Number(run.confidence) : null;
  const pressure = run && !isNil(run.pressureIndex) ? Number(run.pressureIndex) : null;
  const wicketRisk = run && !isNil(run.wicketRisk) ? Number(run.wicketRisk) : null;
  const lean = momentumLine(run?.momentum, sides);
  const live = run?.stage === 'live' || status === 'live';

  const showPhase = Boolean(phase && phase !== 'Upcoming' && phase !== 'Live');
  const facts = [
    score ? { label: 'Score', value: score } : null,
    showPhase ? { label: 'Status', value: phase } : null,
    situation.inning !== null
      ? { label: 'Innings', value: situation.inning === 1 ? '1st' : situation.inning === 2 ? '2nd' : String(situation.inning) }
      : null,
    situation.modelOver !== null ? { label: 'Over', value: String(situation.modelOver) } : null,
    situation.wicketsLost !== null && !(situation.wicketsLost === 0 && !score)
      ? { label: 'Wickets', value: `${situation.wicketsLost} down` }
      : null,
    situation.requiredRuns !== null && situation.requiredRuns > 0
      ? { label: situation.inning === 2 ? 'Target' : 'Need', value: String(situation.requiredRuns) }
      : null,
    situation.parScore !== null && situation.parScore > 0
      ? { label: 'Par', value: String(situation.parScore) }
      : null,
    usefulScoreRange(range, score ? Number(score.split('/')[0]) : null)
      ? { label: 'Score band', value: `${range?.low}–${range?.high}${range?.expected ? ` · likely ${range.expected}` : ''}` }
      : null,
    toss ? { label: 'Toss', value: toss } : null,
    format ? { label: 'Format', value: format } : null,
    when ? { label: 'When', value: when } : null,
    ground ? { label: 'Ground', value: ground } : null,
  ].filter((row): row is { label: string; value: string } => row !== null);

  return (
    <Link
      href={href}
      className="flex h-full flex-col rounded-md border border-lborder bg-card p-5 transition-colors hover:border-accent"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="truncate text-[11px] font-bold uppercase tracking-widest text-stext">
          {String(match.tournament || 'Match')}
        </p>
        <Badge tone={live ? 'live' : 'primary'}>
          {run ? stageLabel(run.stage) : live ? 'Live' : 'Upcoming'}
        </Badge>
      </div>

      <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <TeamLogo code={sides.homeCode} name={sides.homeName} size="md" link={false} />
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-bold tracking-wider text-stext">{sides.homeCode}</p>
            <p className="truncate text-sm font-bold text-mtext">{sides.homeName}</p>
          </div>
        </div>
        <span className="text-[10px] font-bold text-stext">VS</span>
        <div className="flex min-w-0 items-center justify-end gap-2 text-right">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-bold tracking-wider text-stext">{sides.awayCode}</p>
            <p className="truncate text-sm font-bold text-mtext">{sides.awayName}</p>
          </div>
          <TeamLogo code={sides.awayCode} name={sides.awayName} size="md" link={false} />
        </div>
      </div>

      {situation.scoreLine ? (
        <p className="mb-3 truncate font-mono text-lg font-black tabular-nums text-mtext">
          {situation.scoreLine}
        </p>
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
          <div className="mt-4 grid grid-cols-3 gap-2.5">
            <RingMeter label="Confidence" value={confidence} />
            <RingMeter label="Pressure" value={pressure !== null && pressure > 0 ? pressure : null} />
            <RingMeter label="Wicket soon" value={!finished && wicketRisk !== null && wicketRisk > 0 ? wicketRisk : null} />
          </div>
          <div className="mt-3 min-h-10 space-y-1">
            {situation.needLine ? (
              <p className="line-clamp-2 text-xs font-semibold text-accent">{situation.needLine}</p>
            ) : null}
            {lean ? <p className="truncate text-xs font-semibold text-mtext">{lean}</p> : null}
            {why ? <p className="line-clamp-2 text-xs text-stext">{why}</p> : null}
          </div>
        </div>
      ) : (
        <p className="text-sm text-stext">Chance of winning not ready yet</p>
      )}

      {facts.length > 0 ? (
        <div className="mt-auto grid grid-cols-2 gap-x-3 gap-y-3 border-t border-lborder pt-4">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stext">{fact.label}</p>
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
