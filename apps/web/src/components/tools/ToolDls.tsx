'use client';

import { useMemo, useState } from 'react';
import { formatOvers, parScore, resourcesUsed, resourceRemaining, revisedTarget, type DlsFormat } from '../../lib/dlsMath';
import { cricketOvers } from '../../lib/cricketMath';
import type { ToolDef } from '../../lib/toolsCatalog';
import { Field, MoreTools, ResultBox, ToolIntro, num } from './ToolShared';

export default function ToolDls({ tool }: { tool: ToolDef }) {
  const [format, setFormat] = useState<DlsFormat>('odi');
  const [t1Score, setT1Score] = useState('');
  const [t1Overs, setT1Overs] = useState('');
  const [t1Wkts, setT1Wkts] = useState('');
  const [t1AllOut, setT1AllOut] = useState(false);
  const [t2Overs, setT2Overs] = useState('');
  const [t2Faced, setT2Faced] = useState('');
  const [t2Wkts, setT2Wkts] = useState('');

  const scheduled = formatOvers(format);
  const result = useMemo(() => {
    const faced1 = cricketOvers(num(t1Overs));
    const alloc2 = cricketOvers(num(t2Overs) || scheduled);
    if (faced1 === null || alloc2 === null) return null;
    const r1 = resourcesUsed(faced1, num(t1Wkts), scheduled, t1AllOut);
    const r2 = 100 - resourceRemaining(alloc2, 0, scheduled, false);
    const target = revisedTarget(num(t1Score), r1, r2, format);
    const faced2 = t2Faced ? cricketOvers(num(t2Faced)) : null;
    const used2 = faced2 !== null ? resourcesUsed(faced2, num(t2Wkts), scheduled, false) : null;
    const par = used2 !== null && target !== null ? parScore(num(t1Score), r1, used2, format) : null;
    return { r1, r2, target, par };
  }, [format, t1Score, t1Overs, t1Wkts, t1AllOut, t2Overs, t2Faced, t2Wkts, scheduled]);

  return (
    <div className="space-y-6">
      <ToolIntro tool={tool} />
      <p className="text-xs text-stext">
        Uses the published Duckworth–Lewis exponential resource curve. Official ICC DLS/Stern tables are licensed — this is an educational target only.
      </p>
      <div className="overflow-hidden rounded-md border border-lborder bg-card">
        <div className="grid grid-cols-1 gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stext">Format</span>
              <select
                value={format}
                onChange={(event) => setFormat(event.target.value === 't20' ? 't20' : 'odi')}
                className="w-full rounded-md border border-lborder bg-secondary px-3 py-2.5 text-sm font-semibold text-mtext outline-none focus:border-accent"
              >
                <option value="odi">ODI — 50 overs</option>
                <option value="t20">T20 — 20 overs</option>
              </select>
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Team 1 score" value={t1Score} onChange={setT1Score} />
              <Field label="Team 1 overs faced" value={t1Overs} onChange={setT1Overs} />
              <Field label="Team 1 wickets" value={t1Wkts} onChange={setT1Wkts} />
              <Field label={`Team 2 overs available (${scheduled} max)`} value={t2Overs} onChange={setT2Overs} />
              <Field label="Team 2 overs faced (par)" value={t2Faced} onChange={setT2Faced} />
              <Field label="Team 2 wickets now" value={t2Wkts} onChange={setT2Wkts} />
            </div>
            <label className="flex items-center gap-2 text-sm text-mtext">
              <input type="checkbox" checked={t1AllOut} onChange={(event) => setT1AllOut(event.target.checked)} />
              Team 1 all out
            </label>
          </div>
          <div className="space-y-3">
            <ResultBox label="Revised target" value={result?.target !== null && result?.target !== undefined ? String(result.target) : '—'} />
            <ResultBox label="Par now" value={result?.par !== null && result?.par !== undefined ? String(result.par) : '—'} />
            <p className="text-xs text-stext">
              R1 {result ? result.r1.toFixed(1) : '—'}% · R2 {result ? result.r2.toFixed(1) : '—'}%
            </p>
          </div>
        </div>
      </div>
      <MoreTools currentSlug={tool.slug} />
    </div>
  );
}
