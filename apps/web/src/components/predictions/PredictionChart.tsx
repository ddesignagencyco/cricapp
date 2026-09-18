'use client';

import { useMemo, useState, type ComponentType } from 'react';
import { TrendingUp } from 'lucide-react';
import type { PredictionChartPoint, PredictionRun } from '../../types/predictions';
import { asPercent, normalizeChartPoint, stageLabel } from '../../lib/predictions';

interface Props {
  points: PredictionChartPoint[];
  homeLabel: string;
  awayLabel: string;
  preMatch?: PredictionRun | null;
}

export default function PredictionChart({ points, homeLabel, awayLabel, preMatch = null }: Props) {
  const series = useMemo(() => buildSeries(points, preMatch), [points, preMatch]);
  const [active, setActive] = useState<number | null>(null);

  if (series.length === 0) {
    return <p className="py-10 text-center text-sm text-stext">No chart points from the prediction API yet.</p>;
  }

  const selectedIndex = active ?? series.length - 1;
  const selected = series[selectedIndex];
  const width = 860;
  const height = 268;
  const pad = { t: 46, r: 78, b: 40, l: 44 };
  const lastOver = Math.max(0, ...series.map((point) => point.x));
  const maxOver = axisMax(lastOver);
  const toX = (over: number) => pad.l + (over / maxOver) * (width - pad.l - pad.r);
  const toY = (prob: number) => pad.t + (1 - Number(prob)) * (height - pad.t - pad.b);
  const homePath = linePath(series.map((point) => [toX(point.x), toY(Number(point.homeWinProb))] as const));
  const awayPath = linePath(series.map((point) => [toX(point.x), toY(Number(point.awayWinProb))] as const));
  const first = series[0];
  const last = series[series.length - 1];
  const firstX = toX(first.x);
  const lastX = toX(last.x);
  const showStartLabels = lastX - firstX > 90;
  const startYs = spreadLabelYs(toY(Number(first.homeWinProb)), toY(Number(first.awayWinProb)));
  const endYs = spreadLabelYs(toY(Number(last.homeWinProb)), toY(Number(last.awayWinProb)));
  const ticks = overTicks(lastOver, maxOver);
  const homeHigh = Number(last.homeWinProb) >= Number(last.awayWinProb);
  const homeColor = homeHigh ? 'var(--color-success)' : 'var(--color-danger)';
  const awayColor = homeHigh ? 'var(--color-danger)' : 'var(--color-success)';
  const homeDot = homeHigh ? 'bg-success' : 'bg-danger';
  const awayDot = homeHigh ? 'bg-danger' : 'bg-success';
  const homeFill = homeHigh ? 'fill-success' : 'fill-danger';
  const awayFill = homeHigh ? 'fill-danger' : 'fill-success';
  const markerX = toX(selected.x);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <CardTitle icon={TrendingUp} title="Probability timeline" />
        <div className="flex items-center gap-4 text-xs font-semibold text-stext">
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${homeDot}`} />
            {homeLabel}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${awayDot}`} />
            {awayLabel}
          </span>
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-60 w-full sm:h-64"
          role="img"
          aria-label="Win probability timeline"
          onMouseLeave={() => setActive(null)}
        >
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
            <g key={tick}>
              <line
                x1={pad.l}
                x2={width - pad.r}
                y1={toY(tick)}
                y2={toY(tick)}
                stroke="currentColor"
                className="text-lborder"
                strokeWidth={tick === 0.5 ? 1.25 : 1}
              />
              <text x={pad.l - 10} y={toY(tick) + 3.5} textAnchor="end" className="fill-stext text-[10px]">
                {Math.round(tick * 100)}%
              </text>
            </g>
          ))}

          <line x1={markerX} x2={markerX} y1={pad.t} y2={height - pad.b} stroke="currentColor" className="text-lborder" strokeDasharray="3 4" />

          <path d={homePath} fill="none" stroke={homeColor} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />
          <path d={awayPath} fill="none" stroke={awayColor} strokeWidth="2.75" strokeLinecap="round" strokeLinejoin="round" />

          {series.map((point, index) => {
            const isActive = selectedIndex === index;
            return (
              <g
                key={point.key}
                className="cursor-pointer"
                onClick={() => setActive(index)}
                onMouseEnter={() => setActive(index)}
              >
                <rect x={toX(point.x) - 14} y={pad.t} width="28" height={height - pad.t - pad.b} fill="transparent" />
                <circle cx={toX(point.x)} cy={toY(Number(point.homeWinProb))} r={isActive ? 5.5 : 4} fill="var(--color-card)" stroke={homeColor} strokeWidth="2.25" />
                <circle cx={toX(point.x)} cy={toY(Number(point.awayWinProb))} r={isActive ? 5.5 : 4} fill="var(--color-card)" stroke={awayColor} strokeWidth="2.25" />
              </g>
            );
          })}

          {showStartLabels && (
            <>
              <PercentLabel
                x={firstX - 10}
                y={startYs.homeY}
                anchor="end"
                className={`${homeFill} text-[11px] font-semibold`}
                value={asPercent(first.homeWinProb)}
              />
              <PercentLabel
                x={firstX - 10}
                y={startYs.awayY}
                anchor="end"
                className={`${awayFill} text-[11px] font-semibold`}
                value={asPercent(first.awayWinProb)}
              />
            </>
          )}
          <PercentLabel
            x={lastX + 12}
            y={endYs.homeY}
            anchor="start"
            className={`${homeFill} text-[12px] font-bold`}
            value={asPercent(last.homeWinProb)}
          />
          <PercentLabel
            x={lastX + 12}
            y={endYs.awayY}
            anchor="start"
            className={`${awayFill} text-[12px] font-bold`}
            value={asPercent(last.awayWinProb)}
          />

          {ticks.map((tick) => (
            <text key={tick.key} x={toX(tick.over)} y={height - 8} textAnchor="middle" className="fill-stext text-[10px]">
              {tick.label}
            </text>
          ))}
        </svg>

        <div className="pointer-events-none absolute inset-x-10 top-1.5 z-10 flex justify-center sm:inset-x-14">
          <div className="rounded-full bg-card px-3 py-1.5 text-[11px] font-medium text-stext ring-1 ring-lborder">
            {stageLabel(selected.stage)}
            {selected.x > 0 ? ` · ${selected.x} ov` : ''}
            {' · '}
            <span className={homeHigh ? 'text-success' : 'text-danger'}>{homeLabel} {asPercent(selected.homeWinProb)}</span>
            {' / '}
            <span className={homeHigh ? 'text-danger' : 'text-success'}>{awayLabel} {asPercent(selected.awayWinProb)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function buildSeries(points: PredictionChartPoint[], preMatch: PredictionRun | null): Array<PredictionChartPoint & { x: number; key: string }> {
  const seen = new Set<string>();
  const series = points
    .map((point) => normalizeChartPoint(point))
    .filter((point): point is PredictionChartPoint => point !== null)
    .map((point, index) => ({
      ...point,
      x: point.stage === 'pre_match' ? 0 : Number(point.over ?? index + 1),
      key: point.runId || `${point.stage}-${point.createdAt}-${point.over}-${index}`,
    }))
    .filter((point) => {
      const key = `${point.stage}-${point.x}-${point.homeWinProb}-${point.awayWinProb}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

  const hasPre = series.some((point) => point.stage === 'pre_match' || point.x === 0);
  if (preMatch && !hasPre) {
    series.unshift({
      runId: preMatch.runId,
      stage: 'pre_match',
      homeWinProb: preMatch.homeWinProb,
      awayWinProb: preMatch.awayWinProb,
      over: 0,
      x: 0,
      key: `pre-${preMatch.runId}`,
    });
  }

  return series.sort((a, b) => a.x - b.x || String(a.createdAt || '').localeCompare(String(b.createdAt || '')));
}

function spreadLabelYs(homeY: number, awayY: number, minGap = 16): { homeY: number; awayY: number } {
  if (Math.abs(homeY - awayY) >= minGap) return { homeY, awayY };
  const mid = (homeY + awayY) / 2;
  if (homeY <= awayY) {
    return { homeY: mid - minGap / 2, awayY: mid + minGap / 2 };
  }
  return { homeY: mid + minGap / 2, awayY: mid - minGap / 2 };
}

function PercentLabel({
  x,
  y,
  value,
  className,
  anchor,
}: {
  x: number;
  y: number;
  value: string;
  className: string;
  anchor: 'start' | 'end';
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline="middle"
      className={className}
      stroke="var(--color-card)"
      strokeWidth="5"
      paintOrder="stroke"
    >
      {value}
    </text>
  );
}

function linePath(points: ReadonlyArray<readonly [number, number]>): string {
  if (points.length === 1) {
    const [x, y] = points[0];
    return `M ${x} ${y}`;
  }
  return points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x} ${y}`).join(' ');
}

function axisMax(lastOver: number): number {
  if (lastOver > 40) return Math.max(50, lastOver);
  if (lastOver > 20) return Math.max(lastOver, 20);
  return 20;
}

function overTicks(lastOver: number, maxOver: number): Array<{ key: string; over: number; label: string }> {
  const ticks: Array<{ key: string; over: number; label: string }> = [
    { key: 'pre', over: 0, label: 'Pre-match' },
  ];
  if (lastOver >= 4) ticks.push({ key: 'start', over: 1, label: 'Start' });
  for (const step of [5, 10, 15, 20, 30, 40, 50]) {
    if (step <= maxOver - 1.2 && step <= lastOver + 8) {
      ticks.push({ key: String(step), over: step, label: step === 5 ? '5.0 ov' : `${step} ov` });
    }
  }
  if (lastOver > 0.4) {
    ticks.push({ key: 'last', over: lastOver, label: `${Number(lastOver.toFixed(1))} ov` });
  }
  return ticks;
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
