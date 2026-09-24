'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import DirectoryPageHeader from '../DirectoryPageHeader';
import PageToolbar from '../PageToolbar';
import Badge from '../Badge';
import EmptyState from '../EmptyState';
import Tabs from '../Tabs';
import PredictionMatchCard from './PredictionMatchCard';
import PredictionsUpcomingPager from './PredictionsUpcomingPager';
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
  upcomingPage: number;
  upcomingTotal: number;
  upcomingLimit: number;
  initialTab?: 'live' | 'upcoming';
}

export default function PredictionsHub({
  performance,
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
  const hasPerformance = Boolean(performance && sample > 0);
  const hasUpcoming = upcoming.length > 0 || upcomingTotal > 0;
  const visible = tab === 'live' ? live : upcoming;
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
            <p className="font-mono text-2xl font-semibold tabular-nums text-accent">
              {asPercent(performance.accuracy)}
            </p>
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
