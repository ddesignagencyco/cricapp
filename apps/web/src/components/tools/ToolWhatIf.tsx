'use client';

import { useMemo, useState } from 'react';
import { chaseChance, expectedInningsTotal, projectedInnings, winFromExpected } from '../../lib/whatIfMath';
import { formatRate } from '../../lib/cricketMath';
import type { ToolDef } from '../../lib/toolsCatalog';
import { Field, ToolError, ToolPage, ToolPanel, ResultBox } from './ToolShared';
import { firstError, readNumber, readOvers, readWickets } from './toolInputs';

export default function ToolWhatIf({ tool }: { tool: ToolDef }) {
  const isSim = tool.kind === 'match-sim';
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [c, setC] = useState('');
  const [d, setD] = useState('');
  const [e, setE] = useState('');
  const [f, setF] = useState('');

  const reset = () => {
    setA('');
    setB('');
    setC('');
    setD('');
    setE('');
    setF('');
  };

  const view = useMemo(() => {
    if (isSim) {
      const oversA = readOvers(a, 'Team A overs');
      const rpoA = readNumber(b, 'Team A RPO');
      const wktsA = readWickets(c, 'Team A wickets');
      const oversB = readOvers(d, 'Team B overs');
      const rpoB = readNumber(e, 'Team B RPO');
      const wktsB = readWickets(f, 'Team B wickets');
      const error = firstError(oversA, rpoA, wktsA, oversB, rpoB, wktsB);
      if (error) return { lines: [] as string[], headline: '—', error };
      const scoreA = expectedInningsTotal(oversA.value || 20, rpoA.value ?? 0, wktsA.value ?? 0);
      const scoreB = expectedInningsTotal(oversB.value || 20, rpoB.value ?? 0, wktsB.value ?? 0);
      if (scoreA === null || scoreB === null) return { lines: [] as string[], headline: '—', error: null };
      const win = winFromExpected(scoreA, scoreB);
      return {
        headline: `${scoreA.toFixed(0)} vs ${scoreB.toFixed(0)}`,
        error: null,
        lines: [
          `Team A expected ${scoreA.toFixed(1)}`,
          `Team B expected ${scoreB.toFixed(1)}`,
          `P(A) ${(win.a * 100).toFixed(1)}% · P(B) ${(win.b * 100).toFixed(1)}% · tie ${(win.tie * 100).toFixed(1)}%`,
        ],
      };
    }
    const runs = readNumber(a, 'Current runs', { integer: true });
    const faced = readOvers(b, 'Overs faced');
    const left = readOvers(c, 'Overs left');
    const wickets = readWickets(d, 'Wickets down');
    const rpo = readNumber(e, 'Assumed RPO');
    const targetInput = readNumber(f, 'Target', { integer: true });
    const error = firstError(runs, faced, left, wickets, rpo, targetInput);
    if (error) return { lines: [] as string[], headline: '—', error };
    const proj = projectedInnings({
      currentRuns: runs.value ?? 0,
      oversFaced: faced.value ?? 0,
      oversLeft: left.value ?? 0,
      wickets: wickets.value ?? 0,
      assumedRpo: rpo.value ?? 0,
    });
    if (!proj) return { lines: [] as string[], headline: '—', error: null };
    const target = targetInput.value ?? 0;
    // All out: the total is final, so the chase is decided rather than estimated.
    let chance: number | null = null;
    if (target > 0) {
      chance = proj.allOut ? (proj.projected >= target ? 1 : 0) : chaseChance(proj.projected, target, left.value ?? 0);
    }
    return {
      headline: formatRate(proj.projected, 1),
      error: null,
      lines: [
        proj.allOut
          ? 'All out · innings complete'
          : `Remaining ${proj.remaining.toFixed(1)} · band ${proj.low.toFixed(0)}–${proj.high.toFixed(0)}`,
        chance !== null ? `Chase chance ${(chance * 100).toFixed(1)}%` : 'Add a target for chase %',
      ],
    };
  }, [isSim, a, b, c, d, e, f]);

  return (
    <ToolPage
      tool={tool}
      note="Closed-form projection from the numbers you type. It does not read a live match or invent a result from our database."
    >
      <ToolPanel
        onReset={reset}
        aside={
          <>
            <ResultBox value={view.headline} />
            {view.lines.map((line) => (
              <p key={line} className="text-xs text-stext">
                {line}
              </p>
            ))}
          </>
        }
      >
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
        <ToolError message={view.error} />
      </ToolPanel>
    </ToolPage>
  );
}
