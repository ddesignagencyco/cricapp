import SectionHeader from '../SectionHeader';
import Badge from '../Badge';
import EmptyState from '../EmptyState';
import PredictionMatchCard from './PredictionMatchCard';
import { asPercent, bandTone } from '../../lib/predictions';
import type { Match } from '../../types';
import type { MatchPredictions, PredictionChartPoint, PredictionPerformance } from '../../types/predictions';

interface Card {
  match: Match;
  predictions: MatchPredictions | null;
  chartPoints?: PredictionChartPoint[];
}

interface Props {
  performance: PredictionPerformance | null;
  live: Card[];
  upcoming: Card[];
}

export default function PredictionsHub({ performance, live, upcoming }: Props) {
  const sample = performance?.sampleSize ?? 0;
  const hasPerformance = Boolean(performance && sample > 0);
  const hasMatches = live.length > 0 || upcoming.length > 0;

  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6">
      <header>
        <h1 className="text-3xl font-black tracking-tight text-mtext sm:text-4xl">Predictions</h1>
        <p className="mt-2 max-w-xl text-sm text-stext">
          Pre-match and live winner probabilities from the model.
        </p>
      </header>

      {hasPerformance && performance && (
        <section>
          <SectionHeader title="Model performance" subtitle={performance.modelVersion} icon="trendingup" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <PerformanceStat label="Accuracy" value={asPercent(performance.accuracy)} />
            <PerformanceStat
              label="Brier score"
              value={performance.brierScore == null ? '—' : Number(performance.brierScore).toFixed(3)}
            />
            <PerformanceStat label="Sample" value={String(sample)} />
          </div>
          {(performance.byFormat.length > 0 || performance.byConfidenceBand.length > 0) && (
            <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Breakdown
                title="By format"
                rows={performance.byFormat.map((row) => ({
                  key: row.format,
                  label: row.format.toUpperCase(),
                  sample: row.sampleSize,
                  accuracy: row.accuracy,
                  tone: 'primary',
                }))}
              />
              <Breakdown
                title="By confidence"
                rows={performance.byConfidenceBand.map((row) => ({
                  key: row.band,
                  label: row.band,
                  sample: row.sampleSize,
                  accuracy: row.accuracy,
                  tone: bandTone(row.band),
                }))}
              />
            </div>
          )}
        </section>
      )}

      {live.length > 0 && (
        <section>
          <SectionHeader title="Live" subtitle="Live matches and any stored live-stage probabilities" icon="zap" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {live.map(({ match, predictions, chartPoints }) => (
              <PredictionMatchCard
                key={String(match.matchId || match.id)}
                match={match}
                predictions={predictions}
                chartPoints={chartPoints}
              />
            ))}
          </div>
        </section>
      )}

      {upcoming.length > 0 && (
        <section>
          <SectionHeader title="Upcoming" subtitle="Next fixtures. Win probabilities appear after a pre-match run." icon="calendar" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {upcoming.map(({ match, predictions, chartPoints }) => (
              <PredictionMatchCard
                key={String(match.matchId || match.id)}
                match={match}
                predictions={predictions}
                chartPoints={chartPoints}
              />
            ))}
          </div>
        </section>
      )}

      {!hasMatches && (
        <EmptyState
          title="No matches to show"
          message="Upcoming and live fixtures will appear here, with probabilities once the model scores them."
        />
      )}
    </div>
  );
}

function PerformanceStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-lborder bg-card p-5">
      <p className="text-xs font-bold uppercase tracking-widest text-stext">{label}</p>
      <p className="mt-2 font-mono text-3xl font-black tabular-nums text-accent">{value}</p>
    </div>
  );
}

function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ key: string; label: string; sample: number; accuracy: number; tone: string }>;
}) {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-3xl border border-lborder bg-card p-5">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-stext">{title}</p>
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Badge tone={row.tone}>{row.label}</Badge>
              <span className="text-xs text-stext">{row.sample} matches</span>
            </div>
            <span className="font-mono text-sm font-black text-mtext">{asPercent(row.accuracy)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
