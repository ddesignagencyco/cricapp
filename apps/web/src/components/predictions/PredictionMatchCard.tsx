import Link from 'next/link';
import TeamLogo from '../TeamLogo';
import Badge from '../Badge';
import WinProbabilityBar from './WinProbabilityBar';
import { featuredRun, matchSides, stageLabel } from '../../lib/predictions';
import { formatDate, formatScheduled } from '../../utils/helpers';
import type { Match } from '../../types';
import type { MatchPredictions, PredictionChartPoint } from '../../types/predictions';

interface Props {
  match: Match;
  predictions: MatchPredictions | null;
  chartPoints?: PredictionChartPoint[];
}

export default function PredictionMatchCard({ match, predictions }: Props) {
  const matchId = String(match.matchId || match.id || '');
  const sides = matchSides(match);
  const run = featuredRun(predictions);
  const { date, time } = formatScheduled(match.scheduled);
  const when = [date ? formatDate(date) : '', time].filter(Boolean).join(' · ');
  const status = String(match.status || '').toLowerCase();
  const href = run ? `/predictions/${matchId}` : `/matches/${matchId}`;

  return (
    <Link
      href={href}
      className="block rounded-2xl border border-lborder/80 bg-card p-5 transition-colors hover:border-accent/40"
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <p className="truncate text-xs font-bold uppercase tracking-widest text-stext">
          {String(match.tournament || 'Match')}
        </p>
        <Badge tone={run?.stage === 'live' || status === 'live' ? 'live' : 'primary'}>
          {run ? stageLabel(run.stage) : status === 'live' ? 'Live' : 'Upcoming'}
        </Badge>
      </div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <TeamLogo code={sides.homeCode} name={sides.homeName} size="sm" link={false} />
          <p className="truncate text-sm font-bold text-mtext">{sides.homeName}</p>
        </div>
        <span className="text-[11px] font-black text-stext">VS</span>
        <div className="flex min-w-0 items-center justify-end gap-2">
          <p className="truncate text-sm font-bold text-mtext">{sides.awayName}</p>
          <TeamLogo code={sides.awayCode} name={sides.awayName} size="sm" link={false} />
        </div>
      </div>
      {run ? (
        <WinProbabilityBar
          homeLabel={sides.homeCode}
          awayLabel={sides.awayCode}
          homeWinProb={run.homeWinProb}
          awayWinProb={run.awayWinProb}
          compact
        />
      ) : (
        <p className="text-xs font-semibold text-stext">
          {when ? `${when} · Prediction pending` : 'Prediction pending'}
        </p>
      )}
    </Link>
  );
}
