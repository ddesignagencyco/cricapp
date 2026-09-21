'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import SectionHeader from '../SectionHeader';
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
  const tab = fromUrl === 'live' || fromUrl === 'upcoming'
    ? fromUrl
    : initialTab ?? firstWithItems;
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
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <header>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-mtext sm:text-4xl">Predictions</h1>
            <p className="mt-2 max-w-xl text-sm text-stext">
              Modelled win probabilities · Live and upcoming matches
            </p>
          </div>
          <p className="text-xs text-stext">
            <span className="font-semibold text-mtext">{tabTotal}</span> {tab}
          </p>
        </div>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-lborder pb-3">
        <Tabs
          tabs={[
            { key: 'live', label: 'Live', count: live.length },
            { key: 'upcoming', label: 'Upcoming', count: upcomingTotal },
          ]}
          active={tab}
          onChange={handleTabChange}
        />
      </div>

      {hasPerformance && performance && (
        <section>
          <SectionHeader
            title="How these guesses have done"
            subtitle="Settled matches only — we do not drop the ones that were wrong"
            icon="trendingup"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PerformanceStat label="Accuracy" value={asPercent(performance.accuracy)} />
            <PerformanceStat label="Settled matches" value={String(sample)} />
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

      {visible.length > 0 ? (
        <section>
          <div className="grid items-stretch gap-4 [grid-template-columns:repeat(auto-fill,minmax(min(100%,20rem),1fr))]">
            {visible.map(({ match, predictions, chartPoints }) => (
              <PredictionMatchCard
                key={String(match.matchId || match.id)}
                match={match}
                predictions={predictions}
                chartPoints={chartPoints}
              />
            ))}
          </div>
          {tab === 'upcoming' && (
            <PredictionsUpcomingPager page={upcomingPage} total={upcomingTotal} limit={upcomingLimit} />
          )}
        </section>
      ) : (
        <EmptyState
          title={tab === 'live' ? 'No live matches' : hasUpcoming ? 'No fixtures on this page' : 'No upcoming matches'}
          message={
            tab === 'live'
              ? 'When a game is on, the live chance of winning will show here.'
              : hasUpcoming
                ? 'Try another page of upcoming matches.'
                : 'Upcoming fixtures will appear here, with a chance of winning once we have a prediction.'
          }
        />
      )}
    </div>
  );
}

function PerformanceStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="prediction-card rounded-xl border border-lborder/80 bg-card p-5">
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
    <div className="prediction-card rounded-xl border border-lborder/80 bg-card p-5">
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
