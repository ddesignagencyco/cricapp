'use client';

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import Link from 'next/link';
import { Calendar, Info, Target, Trophy, TrendingUp, Users, Zap } from 'lucide-react';
import EmptyState from '../EmptyState';
import Badge, { StatusBadge } from '../Badge';
import TeamLogo from '../TeamLogo';
import { Skeleton } from '../skeletons/Skeletons';
import PredictionChart from './PredictionChart';
import {
  asPercent,
  bandTone,
  explanationReasons,
  factorAttributions,
  featuredRun,
  isNil,
  matchSides,
  mergeChartPoints,
  predictionSituation,
  stageLabel,
  timeAgo,
} from '../../lib/predictions';
import { mergeMatchLivePayload, useMatchStream } from '../../hooks/useMatchStream';
import {
  fetchMatchPredictions,
  fetchPredictionChart,
  fetchPredictionHistory,
  fetchPredictionPerformance,
} from '../../services/predictions';
import type { Match } from '../../types';
import type {
  MatchPredictions,
  PredictionChart as ChartDto,
  PredictionHistory,
  PredictionPerformance,
  PredictionRun,
} from '../../types/predictions';
import { APP_TIME_ZONE } from '../../utils/helpers';

interface Props {
  match: Match;
  initialPredictions?: MatchPredictions | null;
  initialChart?: ChartDto | null;
  initialHistory?: PredictionHistory | null;
  initialPerformance?: PredictionPerformance | null;
}

export default function MatchPredictionsView({
  match: initialMatch,
  initialPredictions,
  initialChart = null,
  initialHistory = null,
  initialPerformance = null,
}: Props) {
  const matchId = String(initialMatch.matchId || initialMatch.id || '');
  const seeded = initialPredictions !== undefined;
  const [match, setMatch] = useState(initialMatch);
  const [predictions, setPredictions] = useState(initialPredictions ?? null);
  const [chart, setChart] = useState(initialChart);
  const [history, setHistory] = useState(initialHistory);
  const [performance, setPerformance] = useState(initialPerformance);
  const [loading, setLoading] = useState(!seeded);
  const [showAllRuns, setShowAllRuns] = useState(false);
  const live = match.status === 'live';
  const liveUpdate = useMatchStream(matchId, live);
  const sides = matchSides(match);

  useEffect(() => {
    setMatch(initialMatch);
  }, [initialMatch]);

  useEffect(() => {
    if (!liveUpdate || liveUpdate.type === 'ping') return;
    const payload = liveUpdate.data && typeof liveUpdate.data === 'object' ? (liveUpdate.data as Record<string, unknown>) : {};
    setMatch((prev) => mergeMatchLivePayload(prev as Record<string, unknown>, payload) as Match);
  }, [liveUpdate]);

  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;
    const load = async (refresh: boolean) => {
      if (!refresh) setLoading(true);
      try {
        const [nextPredictions, nextChart, nextHistory, nextPerformance] = await Promise.all([
          fetchMatchPredictions(matchId),
          fetchPredictionChart(matchId),
          fetchPredictionHistory(matchId),
          fetchPredictionPerformance().catch(() => null),
        ]);
        if (cancelled) return;
        setPredictions(nextPredictions);
        setChart(nextChart);
        setHistory(nextHistory);
        if (nextPerformance) setPerformance(nextPerformance);
      } finally {
        if (!cancelled && !refresh) setLoading(false);
      }
    };
    if (!seeded || live) void load(seeded);
    if (!live) return () => { cancelled = true; };
    const timer = window.setInterval(() => { void load(true); }, 30000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [matchId, live, seeded]);

  const featured = featuredRun(predictions);
  const preMatch = predictions?.preMatch || null;
  const liveRun = predictions?.live || null;
  const chartPoints = useMemo(
    () => mergeChartPoints(chart?.points, history?.runs || (featured ? [featured] : [])),
    [chart?.points, history?.runs, featured]
  );
  const allRuns = useMemo(() => [...(history?.runs || [])].reverse(), [history?.runs]);
  const runs = showAllRuns ? allRuns : allRuns.slice(0, 5);

  if (loading) {
    return <PredictionTabLoader />;
  }

  if (!featured) {
    return (
      <EmptyState
        title="No predictions yet"
        message="The model has not stored a pre-match or live run for this fixture."
        icon={TrendingUp}
      />
    );
  }

  const explanation = featured.explanation || {};
  const situation = predictionSituation(match, featured, sides);
  const range = featured.scoreRange;
  const reasons = explanationReasons(explanation);
  const factors = factorAttributions(explanation);
  const partnership = featured.partnershipProjection;
  const formats = (performance?.byFormat || []).filter((row) => row.sampleSize > 0);
  const preNote = explanationReasons(preMatch?.explanation)[0];
  const topBatters = featured.topBatters || [];
  const topBowlers = featured.topBowlers || [];

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <nav className="mb-2 flex items-center gap-1.5 text-xs text-stext">
            <Link href="/predictions" className="hover:text-accent">Predictions</Link>
            <span>/</span>
            <span className="truncate text-mtext">
              {sides.homeCode} vs {sides.awayCode}
            </span>
          </nav>
          <h1 className="text-3xl font-black tracking-tight text-mtext sm:text-4xl">Match prediction</h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm text-stext">
            <span>
              {sides.homeName} vs {sides.awayName}
              {match.tournament ? ` · ${match.tournament}` : ''}
              {match.venue ? ` · ${match.venue}` : ''}
            </span>
            <StatusBadge status={match.status} />
          </p>
        </div>
        <p className="text-xs text-stext sm:text-right">
          Statistical model output · last run {timeAgo(featured.createdAt)}
        </p>
      </header>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          <Panel>
            <CardTitle icon={TrendingUp} title="Current win probability" />
            <div className="mt-5 flex items-center gap-3 sm:gap-5">
              <TeamBlock
                code={sides.homeCode}
                name={sides.homeName}
                pct={asPercent(featured.homeWinProb)}
                align="left"
                tone={probTone(featured.homeWinProb, featured.awayWinProb)}
              />
              <div className="hidden min-w-[9rem] flex-[1.35] sm:block">
                <WinSplit home={featured.homeWinProb} away={featured.awayWinProb} />
              </div>
              <TeamBlock
                code={sides.awayCode}
                name={sides.awayName}
                pct={asPercent(featured.awayWinProb)}
                align="right"
                tone={probTone(featured.awayWinProb, featured.homeWinProb)}
              />
            </div>
            <div className="mt-4 sm:hidden">
              <WinSplit home={featured.homeWinProb} away={featured.awayWinProb} />
            </div>
            {(situation.scoreLine || situation.needLine || situation.snapshotNote) && (
              <div className="mt-5 space-y-0.5 text-center text-sm text-stext">
                {situation.scoreLine && <p>{situation.scoreLine}</p>}
                {situation.needLine && <p>{situation.needLine}</p>}
                {situation.snapshotNote && <p>{situation.snapshotNote}</p>}
              </div>
            )}
            <div className="mt-5 flex flex-col gap-3 border-t border-lborder pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-stext">
                {preMatch ? (
                  <>
                    Pre-match {asPercent(preMatch.homeWinProb)} / {asPercent(preMatch.awayWinProb)}
                    {liveRun ? (
                      <>
                        <span className="mx-1.5 text-lborder">→</span>
                        Live {asPercent(liveRun.homeWinProb)} / {asPercent(liveRun.awayWinProb)}
                      </>
                    ) : null}
                  </>
                ) : (
                  'Latest stored model run'
                )}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={featured.stage === 'live' ? 'live' : 'primary'}>{stageLabel(featured.stage)}</Badge>
                <Badge tone={bandTone(featured.calibrationBand)}>{title(featured.calibrationBand)}</Badge>
                <Badge tone="neutral">{featured.modelVersion}</Badge>
              </div>
            </div>
          </Panel>

          <Panel>
            <PredictionChart
              points={chartPoints}
              homeLabel={sides.homeCode}
              awayLabel={sides.awayCode}
              preMatch={preMatch}
            />
          </Panel>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <Panel>
              <CardTitle icon={Zap} title="Why the model moved" />
              {situation.snapshotNote && <p className="mt-1 text-xs text-stext">{situation.snapshotNote}</p>}
              <div className="mt-4 space-y-3 text-sm">
                {situation.modelOver !== null && <MetaRow label="Over" value={String(situation.modelOver)} />}
                {situation.inning !== null && <MetaRow label="Innings" value={situation.inning === 1 ? '1st' : String(situation.inning)} />}
                <MetaRow label="Batting" value={situation.battingLabel} />
                <MetaRow label="Wickets lost" value={situation.wicketsLost === null ? '—' : String(situation.wicketsLost)} />
                <MetaRow label="Wickets in hand" value={situation.wicketsInHand === null ? '—' : String(situation.wicketsInHand)} />
                <MetaRow label="Required run rate" value={situation.requiredRunRate !== null ? situation.requiredRunRate.toFixed(2) : '—'} />
                {situation.remainingBalls !== null && <MetaRow label="Balls remaining" value={String(situation.remainingBalls)} />}
                {situation.resourcesLeft !== null && <MetaRow label="Resources left" value={asPercent(situation.resourcesLeft)} />}
                <MetaRow
                  label="Momentum"
                  value={
                    isNil(featured.momentum)
                      ? '—'
                      : `${featured.momentum > 0 ? '+' : ''}${featured.momentum} ${featured.momentum >= 0 ? sides.homeCode : sides.awayCode}`
                  }
                />
                {situation.deltaFromPrevious !== null && (
                  <MetaRow
                    label="Delta from previous"
                    value={`${situation.deltaFromPrevious > 0 ? '+' : ''}${situation.deltaFromPrevious}`}
                  />
                )}
              </div>
              {factors.length > 0 && (
                <ul className="mt-4 space-y-1.5 text-xs text-stext">
                  {factors.map((factor) => (
                    <li key={factor}>{factor}</li>
                  ))}
                </ul>
              )}
              {reasons.length > 0 && <p className="mt-3 text-xs leading-relaxed text-stext">{reasons.join(' · ')}</p>}
            </Panel>
            <Panel>
              <CardTitle icon={Target} title="Projected finish" />
              <p className="mt-4 font-mono text-3xl font-black tabular-nums tracking-tight text-mtext">
                {range?.low ?? '—'}–{range?.high ?? '—'}
              </p>
              <div className="mt-4 space-y-3 text-sm">
                {range?.type && <MetaRow label="Type" value={String(range.type).replace(/_/g, ' ')} />}
                <MetaRow label="Expected" value={!isNil(range?.expected) ? String(range.expected) : '—'} />
                {situation.projectedTotal !== null && <MetaRow label="Projected total" value={String(situation.projectedTotal)} />}
                {range?.unit && <MetaRow label="Unit" value={range.unit} />}
                <MetaRow
                  label="Pressure"
                  value={`${pressureLabel(featured.pressureIndex)}${!isNil(featured.pressureIndex) ? ` (${featured.pressureIndex})` : ''}`}
                />
                <MetaRow label="Wicket risk" value={isNil(featured.wicketRisk) ? '—' : asPercent(featured.wicketRisk)} />
                {!isNil(partnership?.expectedAdditionalRuns) && (
                  <MetaRow
                    label="Partnership"
                    value={`${partnership.expectedAdditionalRuns} runs${!isNil(partnership.horizonBalls) ? ` / ${partnership.horizonBalls} balls` : ''}`}
                  />
                )}
                {partnership?.reliability && <MetaRow label="Partnership reliability" value={partnership.reliability} />}
              </div>
            </Panel>
          </div>

          {(topBatters.length > 0 || topBowlers.length > 0) && (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {topBatters.length > 0 && (
                <Panel>
                  <CardTitle icon={Users} title="Top batters" />
                  <ul className="mt-4 space-y-2 text-sm">
                    {topBatters.slice(0, 5).map((player, index) => (
                      <li key={`${player.playerName || player.name}-${index}`} className="flex justify-between gap-3">
                        <span className="truncate text-mtext">{String(player.playerName || player.name || 'Player')}</span>
                        {!isNil(player.probability) && (
                          <span className="font-mono text-xs font-bold text-accent">{asPercent(Number(player.probability))}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
              {topBowlers.length > 0 && (
                <Panel>
                  <CardTitle icon={Target} title="Top bowlers" />
                  <ul className="mt-4 space-y-2 text-sm">
                    {topBowlers.slice(0, 5).map((player, index) => (
                      <li key={`${player.playerName || player.name}-${index}`} className="flex justify-between gap-3">
                        <span className="truncate text-mtext">{String(player.playerName || player.name || 'Player')}</span>
                        {!isNil(player.probability) && (
                          <span className="font-mono text-xs font-bold text-accent">{asPercent(Number(player.probability))}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </Panel>
              )}
            </div>
          )}

          <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-lborder">
            <div className="border-b border-lborder px-5 py-4 sm:px-6">
              <CardTitle icon={Calendar} title="Recent prediction runs" />
            </div>
            {runs.length === 0 ? (
              <p className="px-5 py-8 text-sm text-stext sm:px-6">No history rows yet.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-lborder text-xs uppercase tracking-wider text-stext">
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">Stage</th>
                        <th className="px-4 py-3 text-center">Over</th>
                        <th className="px-4 py-3 text-center">{sides.homeCode}</th>
                        <th className="px-4 py-3 text-center">{sides.awayCode}</th>
                        <th className="px-4 py-3">Confidence</th>
                      </tr>
                    </thead>
                    <tbody>
                      {runs.map((run) => (
                        <HistoryRow key={run.runId} run={run} />
                      ))}
                    </tbody>
                  </table>
                </div>
                {allRuns.length > 5 && (
                  <div className="border-t border-lborder px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setShowAllRuns((open) => !open)}
                      className="text-xs font-semibold text-accent hover:underline sm:text-sm"
                    >
                      {showAllRuns ? 'Show fewer runs' : 'View full history →'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <Panel>
            <CardTitle icon={Users} title="Model details" />
            <div className="mt-4 space-y-3 text-sm">
              <MetaRow label="Stage" value={stageLabel(featured.stage)} />
              <MetaRow label="Model" value={featured.modelVersion} />
              <MetaRow label="Confidence" value={String(featured.confidence)} />
              <MetaRow label="Calibration band" value={title(featured.calibrationBand)} />
              <MetaRow label="Saved" value={timeAgo(featured.createdAt)} />
            </div>
          </Panel>

          {preMatch && (
            <Panel>
              <CardTitle icon={Trophy} title="Pre-match snapshot" />
              <div className="mt-4 space-y-3">
                <SidePct code={sides.homeCode} name={sides.homeName} pct={asPercent(preMatch.homeWinProb)} />
                <SidePct code={sides.awayCode} name={sides.awayName} pct={asPercent(preMatch.awayWinProb)} />
              </div>
              <div className="mt-4 text-sm">
                <MetaRow label="Model" value={preMatch.modelVersion} />
              </div>
              {preNote && <p className="mt-3 text-xs leading-relaxed text-stext">{preNote}</p>}
            </Panel>
          )}

          {performance && (performance.sampleSize ?? 0) > 0 && (
            <Panel>
              <CardTitle icon={TrendingUp} title="Model performance" />
              <div className="mt-4 space-y-3 text-sm">
                <MetaRow label="Accuracy" value={asPercent(performance.accuracy)} />
                <MetaRow
                  label="Brier score"
                  value={isNil(performance.brierScore) ? '—' : Number(performance.brierScore).toFixed(3)}
                />
                <MetaRow label="Settled sample" value={String(performance.sampleSize)} />
              </div>
              {formats.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {formats.map((row) => (
                    <Badge key={row.format} tone="neutral">
                      {row.format.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              )}
            </Panel>
          )}

          <div className="flex gap-2.5 rounded-2xl bg-card px-4 py-3.5 text-xs leading-relaxed text-stext ring-1 ring-lborder">
            <Info size={15} className="mt-0.5 shrink-0 text-accent" />
            <p>
              Predictions are statistical estimates based on stored model runs. They are not guaranteed, betting odds, or financial advice.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PredictionTabLoader() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder sm:p-6">
        <Skeleton height={28} width={240} />
        <div className="mt-6">
          <Skeleton height={64} />
        </div>
        <div className="mt-4">
          <Skeleton height={14} />
        </div>
      </div>
      <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder sm:p-6">
        <Skeleton height={28} width={200} />
        <div className="mt-4">
          <Skeleton height={220} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
          <Skeleton height={160} />
        </div>
        <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder">
          <Skeleton height={160} />
        </div>
      </div>
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <section className="rounded-2xl bg-card p-5 ring-1 ring-lborder sm:p-6">{children}</section>;
}

function CardTitle({
  icon: Icon,
  title,
}: {
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent/10 text-accent">
        <Icon size={18} strokeWidth={2.5} />
      </div>
      <h2 className="text-lg font-bold tracking-tight text-mtext">{title}</h2>
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-stext">{label}</span>
      <span className="text-right font-semibold tabular-nums text-mtext">{value}</span>
    </div>
  );
}

function WinSplit({ home, away }: { home: number; away: number }) {
  return (
    <div className="flex h-2.5 overflow-hidden rounded-full bg-secondary ring-1 ring-lborder">
      <div
        className={`h-full transition-all ${probTone(home, away) === 'high' ? 'bg-success' : 'bg-danger'}`}
        style={{ width: `${clampPct(home)}%` }}
      />
      <div
        className={`h-full transition-all ${probTone(away, home) === 'high' ? 'bg-success' : 'bg-danger'}`}
        style={{ width: `${clampPct(away)}%` }}
      />
    </div>
  );
}

function TeamBlock({
  code,
  name,
  pct,
  align,
  tone,
}: {
  code: string;
  name: string;
  pct: string;
  align: 'left' | 'right';
  tone: 'high' | 'low' | 'even';
}) {
  const pctColor = tone === 'high' ? 'text-success' : tone === 'low' ? 'text-danger' : 'text-mtext';
  return (
    <div className={`flex min-w-0 flex-1 items-center gap-2.5 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      <TeamLogo code={code} name={name} size="sm" link={false} />
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-stext">{name}</p>
        <p className={`font-mono text-2xl font-black leading-none tabular-nums sm:text-3xl ${pctColor}`}>{pct}</p>
      </div>
    </div>
  );
}

function SidePct({ code, name, pct }: { code: string; name: string; pct: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <TeamLogo code={code} name={name} size="xs" link={false} />
        <p className="truncate text-sm font-semibold text-mtext">{name}</p>
      </div>
      <p className="font-mono text-sm font-bold tabular-nums text-mtext">{pct}</p>
    </div>
  );
}

function HistoryRow({ run }: { run: PredictionRun }) {
  const over = run.explanation && typeof run.explanation.over === 'number' ? run.explanation.over : null;
  return (
    <tr className="border-b border-lborder/60 transition-colors last:border-0 hover:bg-[var(--color-row-hover)]">
      <td className="px-4 py-3 font-mono text-xs tabular-nums text-muted-foreground">{clock(run.createdAt)}</td>
      <td className="px-4 py-3 text-sm text-mtext">{stageLabel(run.stage)}</td>
      <td className="px-4 py-3 text-center font-mono text-sm tabular-nums text-mtext">{over ?? '—'}</td>
      <td className="px-4 py-3 text-center font-mono text-sm font-bold tabular-nums text-mtext">{asPercent(run.homeWinProb)}</td>
      <td className="px-4 py-3 text-center font-mono text-sm font-bold tabular-nums text-mtext">{asPercent(run.awayWinProb)}</td>
      <td className="px-4 py-3">
        <Badge tone={bandTone(run.calibrationBand)}>{title(run.calibrationBand)}</Badge>
      </td>
    </tr>
  );
}

function probTone(self: number, other: number): 'high' | 'low' | 'even' {
  if (Number(self) === Number(other)) return 'even';
  return Number(self) > Number(other) ? 'high' : 'low';
}

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, Number(value) * 100));
}

function pressureLabel(value?: number | null): string {
  if (isNil(value)) return '—';
  if (value >= 0.66) return 'High';
  if (value >= 0.33) return 'Moderate';
  return 'Low';
}

function title(value?: string | null): string {
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function clock(iso?: string): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: APP_TIME_ZONE,
  });
}
