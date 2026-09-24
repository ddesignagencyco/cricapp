'use client';

import { useMemo } from 'react';
import { LineChart } from 'lucide-react';
import type { OddsHistoryPoint } from '../../types/odds';

const SERIES_COLORS = ['var(--color-brand)', 'var(--color-success)', 'var(--color-warning)', 'var(--color-accent)'];

interface Props {
  points: OddsHistoryPoint[];
  selectionLabel: string;
}

export default function OddsHistoryChart({ points, selectionLabel }: Props) {
  const { series, minT, maxT, minY, maxY } = useMemo(() => buildSeries(points), [points]);

  if (series.length === 0 || series.every((s) => s.points.length === 0)) {
    return <p className="py-8 text-center text-sm text-stext">No history yet for this selection.</p>;
  }

  const width = 860;
  const height = 240;
  const pad = { t: 28, r: 16, b: 36, l: 44 };
  const spanT = maxT - minT || 1;
  const spanY = maxY - minY || 0.1;
  const toX = (t: number) => pad.l + ((t - minT) / spanT) * (width - pad.l - pad.r);
  const toY = (y: number) => pad.t + (1 - (y - minY) / spanY) * (height - pad.t - pad.b);

  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-lborder sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="inline-flex items-center gap-2 text-sm font-bold text-mtext">
          <LineChart size={16} className="text-stext" aria-hidden />
          Price history — {selectionLabel}
        </h3>
        <p className="text-[11px] text-stext">Decimal odds · Time (UTC)</p>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-52 w-full" role="img" aria-label="Odds history chart">
        {[0, 0.5, 1].map((frac) => {
          const yVal = minY + spanY * (1 - frac);
          const y = toY(yVal);
          return (
            <g key={frac}>
              <line x1={pad.l} x2={width - pad.r} y1={y} y2={y} stroke="currentColor" className="text-lborder" />
              <text x={pad.l - 8} y={y + 3} textAnchor="end" className="fill-stext text-[10px]">
                {yVal.toFixed(2)}
              </text>
            </g>
          );
        })}
        {series.map((s, index) => {
          const path = s.points
            .map((p, i) => `${i === 0 ? 'M' : 'L'} ${toX(p.t)} ${toY(p.y)}`)
            .join(' ');
          return (
            <path
              key={s.slug}
              d={path}
              fill="none"
              stroke={SERIES_COLORS[index % SERIES_COLORS.length]}
              strokeWidth={2}
              strokeLinecap="round"
            />
          );
        })}
        <text x={width / 2} y={height - 8} textAnchor="middle" className="fill-stext text-[10px]">
          Time (UTC)
        </text>
        <text
          x={12}
          y={height / 2}
          textAnchor="middle"
          transform={`rotate(-90 12 ${height / 2})`}
          className="fill-stext text-[10px]"
        >
          Decimal odds
        </text>
      </svg>
      <ul className="mt-2 flex flex-wrap gap-3 text-xs font-medium text-stext">
        {series.map((s, index) => (
          <li key={s.slug} className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: SERIES_COLORS[index % SERIES_COLORS.length] }}
              aria-hidden
            />
            {s.label}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] text-stext">Movement is informational only, not betting advice.</p>
    </div>
  );
}

function buildSeries(points: OddsHistoryPoint[]) {
  const bySource = new Map<string, { t: number; y: number }[]>();
  for (const p of points) {
    const t = new Date(p.capturedAt).getTime();
    if (Number.isNaN(t)) continue;
    const list = bySource.get(p.sourceSlug) ?? [];
    list.push({ t, y: p.decimalPrice });
    bySource.set(p.sourceSlug, list);
  }
  const series = [...bySource.entries()].map(([slug, pts]) => ({
    slug,
    label: slug,
    points: pts.sort((a, b) => a.t - b.t),
  }));
  const all = series.flatMap((s) => s.points);
  const minT = Math.min(...all.map((p) => p.t));
  const maxT = Math.max(...all.map((p) => p.t));
  const minY = Math.min(...all.map((p) => p.y));
  const maxY = Math.max(...all.map((p) => p.y));
  return { series, minT, maxT, minY, maxY };
}
