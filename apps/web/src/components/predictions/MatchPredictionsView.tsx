'use client';

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import Link from 'next/link';
import { Calendar, FileText, MapPin, MessageCircle, Target, TrendingUp, Users, Zap } from 'lucide-react';
import EmptyState from '../EmptyState';
import Badge, { StatusBadge } from '../Badge';
import TeamLogo from '../TeamLogo';
import DummyAd from '../advertisements/DummyAd';
import { Skeleton } from '../skeletons/Skeletons';
import PredictionChart from './PredictionChart';
import { WinSplitBar } from './WinProbabilityBar';
import {
  asPercent,
  bandTone,
  featuredRun,
  publicNarrative,
  inningsLooksOver,
  isNil,
  matchSides,
  matchStatusLabel,
  mergeChartPoints,
  momentumLine,
  namedPlayerPicks,
  predictionSituation,
  publicTossFact,
  publicVenueWeatherFact,
  publicWhyChanged,
  publicXiSnapshot,
  scoreRangeTitle,
  stageLabel,
  usefulPartnership,
  usefulScoreRange,
  type PredictionSituation,
} from '../../lib/predictions';
import { mergeMatchLivePayload, useMatchStream } from '../../hooks/useMatchStream';
import {
  fetchMatchPredictions,
  fetchPredictionChart,
  fetchPredictionHistory,
} from '../../services/predictions';
import type { Match } from '../../types';
import type {
  MatchPredictions,
  MatchSideLabels,
  PartnershipProjection,
  PredictionChart as ChartDto,
  PredictionHistory,
  PredictionRun,
  PredictionScoreRange,
} from '../../types/predictions';
import { APP_TIME_ZONE, formatDate, formatScheduled } from '../../utils/helpers';

interface Props {
  match: Match;
  initialPredictions?: MatchPredictions | null;
  initialChart?: ChartDto | null;
  initialHistory?: PredictionHistory | null;
}

export default function MatchPredictionsView({
  match: initialMatch,
  initialPredictions,
  initialChart = null,
  initialHistory = null,
}: Props) {
  const matchId = String(initialMatch.matchId || initialMatch.id || '');
  const seeded = initialPredictions !== undefined;
  const [match, setMatch] = useState(initialMatch);
  const [predictions, setPredictions] = useState(initialPredictions ?? null);
  const [chart, setChart] = useState(initialChart);
  const [history, setHistory] = useState(initialHistory);
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
        const [nextPredictions, nextChart, nextHistory] = await Promise.all([
          fetchMatchPredictions(matchId),
          fetchPredictionChart(matchId),
          fetchPredictionHistory(matchId),
        ]);
        if (cancelled) return;
        setPredictions(nextPredictions);
        setChart(nextChart);
        setHistory(nextHistory);
      } finally {
        if (!cancelled && !refresh) setLoading(false);
      }
    };
    if (!seeded) void load(false);
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
        title="No prediction yet"
        message="We do not have a saved chance of winning for this match yet. Check back closer to the start."
        icon={TrendingUp}
      />
    );
  }

  const situation = predictionSituation(match, featured, sides);
  const range = featured.scoreRange;
  const summary = publicNarrative(featured.narrative);
  const partnership = featured.partnershipProjection;
  const topBatters = namedPlayerPicks(featured.topBatters);
  const topBowlers = namedPlayerPicks(featured.topBowlers);
  const tossFact = publicTossFact(featured, match, sides);
  const venueWeather = publicVenueWeatherFact(featured, match);
  const xi = publicXiSnapshot(featured);
  const whyChanged = publicWhyChanged(featured, sides);
  const { date, time } = formatScheduled(match.scheduled);
  const when = [date ? formatDate(date) : '', time].filter(Boolean).join(' · ');
  const format = typeof match.format === 'string' ? match.format.trim() : '';
  const homeTone = probTone(featured.homeWinProb, featured.awayWinProb);
  const awayTone = probTone(featured.awayWinProb, featured.homeWinProb);

  return (
    <div className="space-y-4 sm:space-y-5">
      <nav className="detail-breadcrumb" aria-label="Breadcrumb">
        <Link href="/predictions" className="font-semibold text-accent transition-colors hover:text-mtext">Predictions</Link>
        <span className="text-stext" aria-hidden="true">/</span>
        <span className="truncate font-medium text-mtext max-w-[12rem] sm:max-w-none">{sides.homeCode} vs {sides.awayCode}</span>
        {matchId ? (
          <>
            <span className="text-stext" aria-hidden="true">·</span>
            <Link href={`/matches/${matchId}`} className="font-semibold text-accent hover:underline">
              Match centre
            </Link>
          </>
        ) : null}
      </nav>

      <section className={`detail-hero p-4 sm:p-8 ${live ? 'match-detail-hero--live' : ''}`}>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-lborder pb-4">
          <p className="truncate text-[11px] font-bold uppercase tracking-widest text-stext">
            {[match.tournament || 'Match', format, match.venue, when].filter(Boolean).join('  ·  ')}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge status={match.status} />
            {stageLabel(featured.stage).toLowerCase() !== String(match.status || '').toLowerCase() ? (
              <span className={`detail-chip ${featured.stage === 'live' ? 'text-danger' : 'text-accent'}`}>{stageLabel(featured.stage)}</span>
            ) : null}
            <span className="detail-chip">{confidenceLabel(featured.calibrationBand)}</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
          <TeamHero
            code={sides.homeCode}
            name={sides.homeName}
            pct={asPercent(featured.homeWinProb)}
            align="left"
            tone={homeTone}
          />
          <span className="match-detail-vs">VS</span>
          <TeamHero
            code={sides.awayCode}
            name={sides.awayName}
            pct={asPercent(featured.awayWinProb)}
            align="right"
            tone={awayTone}
          />
        </div>

        <div className="mt-5">
          <WinSplitBar homeWinProb={featured.homeWinProb} awayWinProb={featured.awayWinProb} />
        </div>

        {(situation.scoreLine || situation.needLine || situation.snapshotNote) && (
          <div className="detail-panel mt-6 px-4 py-4 text-center">
            {situation.scoreLine ? (
              <p className="font-mono text-xl font-black tabular-nums tracking-tight text-mtext sm:text-2xl">
                {situation.scoreLine}
              </p>
            ) : null}
            {situation.needLine ? (
              <p className="mt-1 text-sm font-semibold text-accent">{situation.needLine}</p>
            ) : null}
            {situation.snapshotNote ? (
              <p className="mt-1 text-xs text-stext">{situation.snapshotNote}</p>
            ) : null}
          </div>
        )}

        {preMatch ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <ShiftTile
              label="Before play"
              home={asPercent(preMatch.homeWinProb)}
              away={asPercent(preMatch.awayWinProb)}
              homeCode={sides.homeCode}
              awayCode={sides.awayCode}
            />
            <ShiftTile
              label={liveRun ? 'Now' : 'Latest'}
              home={asPercent((liveRun || featured).homeWinProb)}
              away={asPercent((liveRun || featured).awayWinProb)}
              homeCode={sides.homeCode}
              awayCode={sides.awayCode}
              highlight
            />
          </div>
        ) : null}
      </section>

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-5">
          {summary ? (
            <Panel>
              <CardTitle icon={FileText} title="Summary" />
              <p className="mt-4 border-l-2 border-accent pl-4 text-sm leading-relaxed text-mtext">
                {summary}
              </p>
            </Panel>
          ) : null}

          <Panel>
            <PredictionChart
              points={chartPoints}
              homeLabel={sides.homeCode}
              awayLabel={sides.awayCode}
              preMatch={preMatch}
            />
          </Panel>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <SituationPanel
              situation={situation}
              sides={sides}
              momentum={featured.momentum}
            />
            <OutlookPanel
              range={range}
              situation={situation}
              pressureIndex={featured.pressureIndex}
              wicketRisk={featured.wicketRisk}
              partnership={partnership}
            />
          </div>

          {whyChanged ? (
            <Panel>
              <CardTitle icon={MessageCircle} title="Chances" />
              <p className="mt-4 text-sm leading-relaxed text-mtext">{whyChanged}</p>
            </Panel>
          ) : null}

          {(tossFact || venueWeather || xi) && (
            <Panel>
              <CardTitle icon={MapPin} title="Toss, ground and XI" />
              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {tossFact ? <FactTile label="Toss" value={tossFact} /> : null}
                {venueWeather ? <FactTile label="Ground / weather" value={venueWeather} /> : null}
              </div>
              {xi ? (
                <div className="mt-4 border-t border-lborder pt-4">
                  <p className="mb-3 text-xs text-stext">{xi.note}</p>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {xi.home.length > 0 && (
                      <XiList title={sides.homeName} names={xi.home} />
                    )}
                    {xi.away.length > 0 && (
                      <XiList title={sides.awayName} names={xi.away} />
                    )}
                  </div>
                </div>
              ) : null}
            </Panel>
          )}

          {(topBatters.length > 0 || topBowlers.length > 0) && (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {topBatters.length > 0 && (
                <Panel>
                  <CardTitle icon={Users} title="Players most likely to score" />
                  <PlayerRanks players={topBatters} />
                </Panel>
              )}
              {topBowlers.length > 0 && (
                <Panel>
                  <CardTitle icon={Target} title="Players most likely to take wickets" />
                  <PlayerRanks players={topBowlers} />
                </Panel>
              )}
            </div>
          )}

          <section className="detail-panel">
            <div className="border-b border-lborder bg-secondary px-4 py-3 sm:px-5">
              <CardTitle icon={Calendar} title="Recent prediction changes" />
            </div>
            {runs.length === 0 ? (
              <p className="px-5 py-8 text-sm text-stext">No earlier updates yet.</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-lborder bg-secondary text-[10px] font-bold uppercase tracking-widest text-stext">
                        <th className="px-4 py-2.5 font-bold">Time</th>
                        <th className="px-4 py-2.5 font-bold">Stage</th>
                        <th className="px-4 py-2.5 text-center font-bold">Over</th>
                        <th className="px-4 py-2.5 text-center font-bold">{sides.homeCode}</th>
                        <th className="px-4 py-2.5 text-center font-bold">{sides.awayCode}</th>
                        <th className="px-4 py-2.5 font-bold">How sure</th>
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
                      {showAllRuns ? 'Show fewer updates' : 'See every update →'}
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        </div>

        <aside className="w-full space-y-5 xl:w-[300px]">
          <DummyAd size="half-page" placement="prediction-detail-sidebar" />
          <DummyAd size="medium-rectangle" placement="prediction-detail-sidebar-mid" />
        </aside>
      </div>
    </div>
  );
}

function PredictionTabLoader() {
  return (
    <div className="space-y-4 sm:space-y-5" aria-busy="true" aria-live="polite">
      <div className="detail-panel detail-panel-pad">
        <Skeleton height={28} width={240} />
        <div className="mt-6">
          <Skeleton height={88} />
        </div>
        <div className="mt-4">
          <Skeleton height={36} />
        </div>
      </div>
      <div className="detail-panel detail-panel-pad">
        <Skeleton height={28} width={200} />
        <div className="mt-4">
          <Skeleton height={220} />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
        <div className="detail-panel p-5">
          <Skeleton height={160} />
        </div>
        <div className="detail-panel p-5">
          <Skeleton height={160} />
        </div>
      </div>
    </div>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return <section className="detail-panel detail-panel-pad">{children}</section>;
}

function CardTitle({
  icon: Icon,
  title,
}: {
  icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid h-8 w-8 shrink-0 place-items-center rounded-md border border-lborder bg-secondary text-accent">
        <Icon size={16} strokeWidth={2.4} />
      </div>
      <h2 className="text-base font-bold tracking-tight text-mtext">{title}</h2>
    </div>
  );
}

function FactTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-lborder bg-secondary px-3 py-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-stext">{label}</p>
      <p className="mt-1 text-sm font-semibold leading-snug text-mtext">{value}</p>
    </div>
  );
}

function ShiftTile({
  label,
  home,
  away,
  homeCode,
  awayCode,
  highlight = false,
}: {
  label: string;
  home: string;
  away: string;
  homeCode: string;
  awayCode: string;
  highlight?: boolean;
}) {
  return (
    <div className={`detail-panel px-3 py-2.5 ${highlight ? 'detail-panel--active' : ''}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-stext">{label}</p>
      <p className="mt-1 font-mono text-sm font-black tabular-nums text-mtext">
        {homeCode} {home}
        <span className="mx-1.5 font-sans text-xs font-semibold text-stext">/</span>
        {awayCode} {away}
      </p>
    </div>
  );
}

function TeamHero({
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
  const favored = tone === 'high';
  return (
    <div className={`flex min-w-0 items-center gap-3 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      <TeamLogo code={code} name={name} size="lg" link={false} />
      <div className="min-w-0">
        <p className="font-mono text-[10px] font-bold tracking-wider text-stext">{code}</p>
        <p className="truncate text-sm font-bold text-mtext sm:text-base">{name}</p>
        <p className={`mt-1 font-mono text-3xl font-black leading-none tabular-nums sm:text-4xl ${pctColor}`}>{pct}</p>
        {favored ? (
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-success">Favored</p>
        ) : null}
      </div>
    </div>
  );
}

function XiList({ title, names }: { title: string; names: string[] }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-stext">{title}</p>
      <div className="flex flex-wrap gap-1.5">
        {names.map((name) => (
          <span key={name} className="rounded-md border border-lborder bg-secondary px-2 py-1 text-xs font-semibold text-mtext">
            {name}
          </span>
        ))}
      </div>
    </div>
  );
}

function PlayerRanks({ players }: { players: Array<{ name: string; chance?: string }> }) {
  return (
    <ol className="mt-4 space-y-2">
      {players.map((player, index) => (
        <li
          key={player.name}
          className="flex items-center justify-between gap-3 rounded-md border border-lborder bg-secondary px-3 py-2"
        >
          <div className="flex min-w-0 items-center gap-3">
            <span className="w-5 font-mono text-[11px] font-black tabular-nums text-stext">
              {String(index + 1).padStart(2, '0')}
            </span>
            <span className="truncate text-sm font-semibold text-mtext">{player.name}</span>
          </div>
          {player.chance ? (
            <span className="font-mono text-xs font-black tabular-nums text-accent">{player.chance}</span>
          ) : null}
        </li>
      ))}
    </ol>
  );
}

function SituationPanel({
  situation,
  sides,
  momentum,
}: {
  situation: PredictionSituation;
  sides: MatchSideLabels;
  momentum?: number | null;
}) {
  const finished = inningsLooksOver(situation);
  const chaseOn =
    !finished &&
    situation.requiredRunRate !== null &&
    situation.requiredRunRate > 0 &&
    situation.remainingBalls !== null &&
    situation.remainingBalls > 0;
  const showWickets =
    situation.wicketsLost !== null &&
    !(situation.wicketsLost === 0 && situation.wicketsInHand === 10 && !situation.scoreLine);
  const lean = momentumLine(momentum, sides);
  const delta = situation.deltaFromPrevious;
  const facts: Array<{ label: string; value: string }> = [];
  const statusText = matchStatusLabel(situation.matchStatus);

  if (statusText) facts.push({ label: 'Status', value: statusText });
  if (situation.battingLabel) facts.push({ label: 'Batting', value: situation.battingLabel });
  if (situation.inning !== null) {
    facts.push({ label: 'Innings', value: situation.inning === 1 ? '1st' : situation.inning === 2 ? '2nd' : String(situation.inning) });
  }
  if (situation.modelOver !== null) facts.push({ label: 'Over', value: String(situation.modelOver) });
  if (showWickets && situation.wicketsLost !== null) {
    facts.push({
      label: 'Wickets',
      value: `${situation.wicketsLost} down · ${situation.wicketsInHand ?? Math.max(0, 10 - situation.wicketsLost)} left`,
    });
  }
  if (situation.requiredRuns !== null && situation.requiredRuns > 0) {
    facts.push({ label: situation.inning === 2 ? 'Target' : 'Runs still needed', value: String(situation.requiredRuns) });
  }
  if (situation.parScore !== null && situation.parScore > 0) {
    facts.push({ label: 'Par score', value: String(situation.parScore) });
  }
  if (chaseOn && situation.requiredRunRate !== null && situation.remainingBalls !== null) {
    facts.push({
      label: 'Need',
      value: `${situation.requiredRunRate.toFixed(2)} an over · ${situation.remainingBalls} balls left`,
    });
  }
  if (!finished && situation.resourcesLeft !== null && situation.resourcesLeft > 0 && situation.resourcesLeft < 1) {
    facts.push({ label: 'Still in the innings', value: asPercent(situation.resourcesLeft) });
  }
  if (lean) facts.push({ label: 'Momentum', value: lean });
  if (delta !== null && delta !== 0) {
    facts.push({
      label: 'Since last update',
      value: `${delta > 0 ? '+' : ''}${asPercent(Math.abs(delta))} ${delta > 0 ? 'up' : 'down'}`,
    });
  }

  return (
    <Panel>
      <CardTitle icon={Zap} title="Match situation" />
      {situation.scoreLine ? (
        <p className="mt-4 font-mono text-lg font-black tracking-tight text-mtext">{situation.scoreLine}</p>
      ) : situation.battingLabel ? (
        <p className="mt-4 text-lg font-black tracking-tight text-mtext">{situation.battingLabel} batting</p>
      ) : null}
      {situation.needLine ? (
        <p className="mt-1 text-sm font-semibold text-accent">{situation.needLine}</p>
      ) : null}
      {facts.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {facts.map((fact) => (
            <FactTile key={fact.label} label={fact.label} value={fact.value} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function OutlookPanel({
  range,
  situation,
  pressureIndex,
  wicketRisk,
  partnership,
}: {
  range?: PredictionScoreRange | null;
  situation: PredictionSituation;
  pressureIndex?: number | null;
  wicketRisk?: number | null;
  partnership?: PartnershipProjection | null;
}) {
  const finished = inningsLooksOver(situation);
  const currentRuns = situation.scoreLine.match(/(\d+)\s*\//);
  const showRange = usefulScoreRange(range, currentRuns ? Number(currentRuns[1]) : null);
  const showPair = !finished && usefulPartnership(partnership);
  const showPressure = !isNil(pressureIndex) && Number(pressureIndex) > 0;
  const showWicket = !finished && !isNil(wicketRisk) && Number(wicketRisk) > 0;
  const projected = situation.projectedTotal !== null && situation.projectedTotal > 0
    ? situation.projectedTotal
    : null;
  const extras: Array<{ label: string; value: string }> = [];
  if (situation.parScore !== null && situation.parScore > 0) {
    extras.push({ label: 'Par at this point', value: String(situation.parScore) });
  }
  if (projected !== null) extras.push({ label: 'Projected team total', value: String(projected) });
  if (showPair && partnership) {
    extras.push({
      label: 'This pair might add',
      value: `${partnership.expectedAdditionalRuns} runs${
        !isNil(partnership.horizonBalls) ? ` in the next ${partnership.horizonBalls} balls` : ''
      }`,
    });
  }

  return (
    <Panel>
      <CardTitle icon={Target} title={showRange ? scoreRangeTitle(range?.type) : 'Match numbers'} />
      {showRange ? (
        <div className="mt-4 rounded-md border border-lborder bg-secondary px-4 py-3">
          <p className="font-mono text-3xl font-black tabular-nums tracking-tight text-mtext">
            {range?.low}–{range?.high}
            {range?.unit ? <span className="ml-2 text-sm font-semibold text-stext">{range.unit}</span> : null}
          </p>
          {!isNil(range?.expected) && Number(range?.expected) > 0 && (
            <p className="mt-1 text-sm text-stext">Most likely around {range?.expected}</p>
          )}
        </div>
      ) : extras.length > 0 ? (
        <p className="mt-4 text-sm leading-relaxed text-stext">
          Stored numbers from the latest update — no usable score band on this run.
        </p>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-stext">
          No extra score numbers on this update. The win chance above is the latest we have.
        </p>
      )}
      {(showPressure || showWicket) && (
        <div className="mt-4 space-y-3">
          {showPressure ? <LevelMeter label="Pressure on batting" value={Number(pressureIndex)} hint={pressureLabel(pressureIndex)} /> : null}
          {showWicket ? <LevelMeter label="Chance of a wicket soon" value={Number(wicketRisk)} /> : null}
        </div>
      )}
      {extras.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {extras.map((row) => (
            <FactTile key={row.label} label={row.label} value={row.value} />
          ))}
        </div>
      )}
    </Panel>
  );
}

function LevelMeter({ label, value, hint }: { label: string; value: number; hint?: string }) {
  const pct = Math.max(0, Math.min(100, value * 100));
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-semibold text-stext">{label}</span>
        <span className="font-mono font-black tabular-nums text-mtext">{hint || asPercent(value)}</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </div>
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
        <Badge tone={bandTone(run.calibrationBand)}>{confidenceLabel(run.calibrationBand)}</Badge>
      </td>
    </tr>
  );
}

function probTone(self: number, other: number): 'high' | 'low' | 'even' {
  if (Number(self) === Number(other)) return 'even';
  return Number(self) > Number(other) ? 'high' : 'low';
}

function pressureLabel(value?: number | null): string {
  if (isNil(value)) return '—';
  if (value >= 0.66) return 'High';
  if (value >= 0.33) return 'Moderate';
  return 'Low';
}

function confidenceLabel(value?: string | null): string {
  switch ((value || '').toLowerCase()) {
    case 'high':
      return 'High confidence';
    case 'medium':
      return 'Medium confidence';
    case 'low':
      return 'Low confidence';
    default:
      return 'Confidence not set';
  }
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
