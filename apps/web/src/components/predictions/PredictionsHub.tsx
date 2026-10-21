'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { mergeLiveRows, mergeLiveUpdate, useMatchStream, withLatestLive } from '../../hooks/useMatchStream';
import DirectoryPageHeader from '../DirectoryPageHeader';
import PageToolbar from '../PageToolbar';
import Badge from '../Badge';
import EmptyState from '../EmptyState';
import Tabs from '../Tabs';
import PredictionMatchCard from './PredictionMatchCard';
import PredictionsUpcomingPager from './PredictionsUpcomingPager';
import { asPercent, bandTone, isAccuracyPublishable } from '../../lib/predictions';
import type { Match } from '../../types';
import type {
  MatchPredictions,
  PredictionChartPoint,
  PredictionPerformance,
  PredictionPerformanceSnapshot,
} from '../../types/predictions';

interface Card {
  match: Match;
  predictions: MatchPredictions | null;
  chartPoints?: PredictionChartPoint[];
}

interface Props {
  performance: PredictionPerformance | null;
  /** Stored accuracy snapshots, newest first (`GET /predictions/performance/history`). */
  performanceHistory?: PredictionPerformanceSnapshot[];
  live: Card[];
  upcoming: Card[];
  upcomingPage: number;
  upcomingTotal: number;
  upcomingLimit: number;
  initialTab?: 'live' | 'upcoming';
}

export default function PredictionsHub({
  performance,
  performanceHistory = [],
  live,
  upcoming,
  upcomingPage,
  upcomingTotal,
  upcomingLimit,
  initialTab,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const fromUrl = searchParams.get('tab');
  const firstWithItems = live.length > 0 ? 'live' : upcomingTotal > 0 ? 'upcoming' : 'live';
  const tab =
    fromUrl === 'live' || fromUrl === 'upcoming' ? fromUrl : initialTab ?? firstWithItems;
  const sample = performance?.sampleSize ?? 0;
  /**
   * The API refuses to publish an accuracy figure until the sample is large enough
   * (`claimReady: false` at 3 settled matches) and the page used to ignore that,
   * printing "0%" as a headline accuracy. Behind a handful of settled games the
   * figure is noise, so the whole card stays hidden until the backend says it is
   * safe to publish.
   */
  const hasPerformance = isAccuracyPublishable(performance);
  const hasUpcoming = upcoming.length > 0 || upcomingTotal > 0;
    // The page is server-rendered with a 30s cache, so a live card would sit on a stale
  // score for the whole time a match is running. The homepage and the matches page
  // both patch in SSE updates; the predictions page did not, which is why live cards
  // here were the only place a live score could look frozen or missing.
  //
  // Frames are accumulated in state. Merging only the latest frame onto the server
  // rows reverted every other card to its 30s-old score whenever one match updated.
  const liveUpdate = useMatchStream(undefined, tab === 'live');
  const [liveMatches, setLiveMatches] = useState<Match[]>(() => live.map((card) => withLatestLive(card.match)));
  useEffect(() => {
    setLiveMatches((prev) => mergeLiveRows(prev, live.map((card) => card.match)));
  }, [live]);
  useEffect(() => {
    if (liveUpdate) setLiveMatches((prev) => mergeLiveUpdate(prev, liveUpdate));
  }, [liveUpdate]);
  const liveCards = useMemo(() => {
    const byId = new Map(liveMatches.map((match) => [String(match.matchId ?? match.id ?? ''), match]));
    return live.map((card) => ({
      ...card,
      match: byId.get(String(card.match.matchId ?? card.match.id ?? '')) ?? card.match,
    }));
  }, [live, liveMatches]);

  const visible = tab === 'live' ? liveCards : upcoming;
  const tabTotal = tab === 'live' ? live.length : upcomingTotal;

  const handleTabChange = (nextTab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', nextTab);
    params.delete('page');
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <DirectoryPageHeader
        eyebrow="Win probabilities"
        title="Predictions"
        description="Pre-match and live win chances from stored model runs."
        count={tabTotal}
        countLabel={tab}
      />

      <PageToolbar>
        <Tabs
          tabs={[
            { key: 'live', label: 'Live', count: live.length },
            { key: 'upcoming', label: 'Upcoming', count: upcomingTotal },
          ]}
          active={tab}
          onChange={handleTabChange}
        />
      </PageToolbar>

      {hasPerformance && performance ? (
        <section className="prediction-card rounded-md border border-lborder bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-accent">Track record</p>
              <p className="mt-1 text-sm text-stext">{sample} settled matches</p>
            </div>
            <div className="flex items-end gap-4">
              <AccuracyTrend performance={performance} history={performanceHistory} />
              <p className="font-mono text-2xl font-semibold tabular-nums text-accent">
                {asPercent(performance.accuracy)}
              </p>
            </div>
          </div>
          {(performance.byFormat.length > 0 || performance.byConfidenceBand.length > 0) && (
            <div className="mt-4 grid grid-cols-1 gap-4 border-t border-lborder pt-4 lg:grid-cols-2">
              <Breakdown
                title="Format"
                rows={performance.byFormat.map((row) => ({
                  key: row.format,
                  label: row.format.toUpperCase(),
                  sample: row.sampleSize,
                  accuracy: row.accuracy,
                  tone: 'primary',
                }))}
              />
              <Breakdown
                title="Confidence"
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
      ) : null}

      {visible.length > 0 ? (
        <section>
          <div className="grid items-stretch gap-3 [grid-template-columns:repeat(auto-fill,minmax(min(100%,20rem),1fr))]">
            {visible.map(({ match, predictions, chartPoints }) => (
              <PredictionMatchCard
                key={String(match.matchId || match.id)}
                match={match}
                predictions={predictions}
                chartPoints={chartPoints}
              />
            ))}
          </div>
          {tab === 'upcoming' ? (
            <PredictionsUpcomingPager page={upcomingPage} total={upcomingTotal} limit={upcomingLimit} />
          ) : null}
        </section>
      ) : (
        <EmptyState
          title={tab === 'live' ? 'No live matches' : 'No upcoming matches'}
          message={
            tab === 'live'
              ? 'Live fixtures with predictions will appear here.'
              : hasUpcoming
                ? 'Try another page.'
                : 'Upcoming fixtures will appear when scheduled.'
          }
        />
      )}
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
    <div>
      <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-stext">{title}</p>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.key} className="flex items-center justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <Badge tone={row.tone}>{row.label}</Badge>
              <span className="text-xs text-stext">{row.sample}</span>
            </div>
            <span className="shrink-0 font-mono text-sm font-semibold tabular-nums text-mtext">
              {asPercent(row.accuracy)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Accuracy over recorded snapshots as a minimal sparkline. Only snapshots of the same
 * model that themselves cleared the publish threshold are plotted — an early snapshot
 * over a handful of matches is noise, the same reason the headline stays hidden.
 */
function AccuracyTrend({
  performance,
  history,
}: {
  performance: PredictionPerformance;
  history: PredictionPerformanceSnapshot[];
}) {
  const minSample = performance.publishMinSamples ?? 0;
  const points = history
    .filter(
      (row) =>
        row.modelVersion === performance.modelVersion &&
        typeof row.accuracy === 'number' &&
        row.sampleSize >= minSample
    )
    .slice()
    .reverse()
    .map((row) => ({ accuracy: row.accuracy as number, createdAt: row.createdAt }));
  if (points.length < 2) return null;

  const width = 96;
  const height = 28;
  const pad = 2;
  const values = points.map((p) => p.accuracy);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (width - pad * 2);
    const y = max === min ? height / 2 : pad + (1 - (p.accuracy - min) / span) * (height - pad * 2);
    return [Number(x.toFixed(1)), Number(y.toFixed(1))] as const;
  });
  const first = points[0];
  const last = points[points.length - 1];
  const [lastX, lastY] = coords[coords.length - 1];
  const label = `Accuracy trend over ${points.length} snapshots: ${asPercent(first.accuracy)} to ${asPercent(last.accuracy)}`;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="shrink-0 text-accent"
      role="img"
      aria-label={label}
    >
      <title>{label}</title>
      <polyline
        points={coords.map(([x, y]) => `${x},${y}`).join(' ')}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.6}
      />
      <circle cx={lastX} cy={lastY} r={2.25} fill="currentColor" />
    </svg>
  );
}
