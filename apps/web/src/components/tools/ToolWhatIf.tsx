'use client';

import { useMemo, useState } from 'react';
import { chaseChance, expectedInningsTotal, projectedInnings, winFromExpected } from '../../lib/whatIfMath';
import { formatRate } from '../../lib/cricketMath';
import type { ToolDef } from '../../lib/toolsCatalog';
import { Field, MoreTools, ResultBox, ToolIntro, num } from './ToolShared';

export default function ToolWhatIf({ tool }: { tool: ToolDef }) {
  const isSim = tool.kind === 'match-sim';
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [c, setC] = useState('');
  const [d, setD] = useState('');
  const [e, setE] = useState('');
  const [f, setF] = useState('');

  const view = useMemo(() => {
    if (isSim) {
      const scoreA = expectedInningsTotal(num(a) || 20, num(b), num(c));
      const scoreB = expectedInningsTotal(num(d) || 20, num(e), num(f));
      if (scoreA === null || scoreB === null) return { lines: [] as string[], headline: '—' };
      const win = winFromExpected(scoreA, scoreB);
      return {
        headline: `${scoreA.toFixed(0)} vs ${scoreB.toFixed(0)}`,
        lines: [
          `Team A expected ${scoreA.toFixed(1)}`,
          `Team B expected ${scoreB.toFixed(1)}`,
          `P(A) ${(win.a * 100).toFixed(1)}% · P(B) ${(win.b * 100).toFixed(1)}% · tie ${(win.tie * 100).toFixed(1)}%`,
        ],
      };
    }
    const proj = projectedInnings({
      currentRuns: num(a),
      oversFaced: num(b),
      oversLeft: num(c),
      wickets: num(d),
      assumedRpo: num(e),
    });
    if (!proj) return { lines: [] as string[], headline: '—' };
    const target = num(f);
    const chance = target > 0 ? chaseChance(proj.projected, target, num(c)) : null;
    return {
      headline: formatRate(proj.projected, 1),
      lines: [
        `Remaining ${proj.remaining.toFixed(1)} · band ${proj.low.toFixed(0)}–${proj.high.toFixed(0)}`,
        chance !== null ? `Chase chance ${(chance * 100).toFixed(1)}%` : 'Add a target for chase %',
      ],
    };
  }, [isSim, a, b, c, d, e, f]);

  return (
    <div className="space-y-6">
      <ToolIntro tool={tool} />
      <p className="text-xs text-stext">
        Closed-form projection from the numbers you type. It does not read a live match or invent a result from our database.
      </p>
      <div className="overflow-hidden rounded-md border border-lborder bg-card">
        <div className="grid grid-cols-1 gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {isSim ? (
              <>
                <Field label="Team A overs" value={a} onChange={setA} />
                <Field label="Team A RPO" value={b} onChange={setB} />
                <Field label="Team A wickets (expected)" value={c} onChange={setC} />
                <Field label="Team B overs" value={d} onChange={setD} />
                <Field label="Team B RPO" value={e} onChange={setE} />
                <Field label="Team B wickets (expected)" value={f} onChange={setF} />
              </>
            ) : (
              <>
                <Field label="Current runs" value={a} onChange={setA} />
                <Field label="Overs faced" value={b} onChange={setB} />
                <Field label="Overs left" value={c} onChange={setC} />
                <Field label="Wickets down" value={d} onChange={setD} />
                <Field label="Assumed RPO" value={e} onChange={setE} />
                <Field label="Target (optional)" value={f} onChange={setF} />
              </>
            )}
          </div>
          <div className="space-y-3">
            <ResultBox value={view.headline} />
            {view.lines.map((line) => (
              <p key={line} className="text-xs text-stext">
                {line}
              </p>
            ))}
          </div>
        </div>
      </div>
      <MoreTools currentSlug={tool.slug} />
    </div>
  );
}
