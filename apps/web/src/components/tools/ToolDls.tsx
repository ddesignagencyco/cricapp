'use client';

import { useMemo, useState } from 'react';
import { dlsEstimate, formatOvers, type DlsFormat } from '../../lib/dlsMath';
import { cricketOvers } from '../../lib/cricketMath';
import type { ToolDef } from '../../lib/toolsCatalog';
import { Field, SelectField, ToolCheckbox, ToolError, ToolPage, ToolPanel, ResultBox } from './ToolShared';
import { firstError, readNumber, readOvers, readWickets } from './toolInputs';

export default function ToolDls({ tool }: { tool: ToolDef }) {
  const [format, setFormat] = useState<DlsFormat>('odi');
  const [t1Score, setT1Score] = useState('');
  const [t1Overs, setT1Overs] = useState('');
  const [t1Wkts, setT1Wkts] = useState('');
  const [t1AllOut, setT1AllOut] = useState(false);
  const [t2Overs, setT2Overs] = useState('');
  const [t2Faced, setT2Faced] = useState('');
  const [t2Wkts, setT2Wkts] = useState('');

  const reset = () => {
    setT1Score('');
    setT1Overs('');
    setT1Wkts('');
    setT1AllOut(false);
    setT2Overs('');
    setT2Faced('');
    setT2Wkts('');
  };

  const scheduled = formatOvers(format);
  const { result, error } = useMemo(() => {
    const score1 = readNumber(t1Score, 'Team 1 score', { integer: true });
    const overs1 = readOvers(t1Overs, 'Team 1 overs faced', { max: scheduled });
    const wkts1 = readWickets(t1Wkts, 'Team 1 wickets');
    const overs2 = readOvers(t2Overs, 'Team 2 overs available', { max: scheduled });
    const alloc2 = overs2.value ?? scheduled;
    const faced2 = readOvers(t2Faced, 'Team 2 overs faced', { max: alloc2 });
    const wkts2 = readWickets(t2Wkts, 'Team 2 wickets');
    const invalid =
      firstError(score1, overs1, wkts1, overs2, faced2, wkts2) ??
      (overs1.value === 0 ? 'Team 1 overs faced must be more than 0.' : null) ??
      (overs2.value === 0 ? 'Team 2 overs available must be more than 0.' : null);
    if (invalid) return { result: null, error: invalid };
    if (score1.value === null || overs1.value === null) return { result: null, error: null };
    return {
      error: null,
      result: dlsEstimate({
        format,
        team1Score: score1.value,
        team1Overs: cricketOvers(overs1.value) ?? 0,
        team1Wickets: wkts1.value ?? 0,
        team1AllOut: t1AllOut,
        team2Overs: cricketOvers(alloc2),
        team2Faced: faced2.value === null ? null : (cricketOvers(faced2.value) ?? 0),
        team2Wickets: wkts2.value ?? 0,
      }),
    };
  }, [format, t1Score, t1Overs, t1Wkts, t1AllOut, t2Overs, t2Faced, t2Wkts, scheduled]);

  return (
    <ToolPage
      tool={tool}
      note="This follows the standard published formula for rain-affected matches. The official ICC table is licensed, so please treat this as a helpful estimate rather than the exact official figure."
    >
      <ToolPanel
        onReset={reset}
        aside={
          <>
            {/* The inputs travel with the share so the recipient sees how the
                number was reached, and the link reopens this form filled in. */}
            <ResultBox
              label="Revised target"
              value={result?.target !== null && result?.target !== undefined ? String(result.target) : '—'}
            />
            <ResultBox
              label="Par now"
              value={result?.par !== null && result?.par !== undefined ? String(result.par) : '—'}
            />
            <p className="text-xs text-stext">
              R1 {result ? result.r1.toFixed(1) : '—'}% · R2 {result ? result.r2.toFixed(1) : '—'}%
            </p>
          </>
        }
      >
        <SelectField label="Format" value={format} onChange={(v) => setFormat(v === 't20' ? 't20' : 'odi')}>
          <option value="odi">ODI — 50 overs</option>
          <option value="t20">T20 — 20 overs</option>
        </SelectField>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Team 1 score" value={t1Score} onChange={setT1Score} />
          <Field label="Team 1 overs faced" value={t1Overs} onChange={setT1Overs} />
          <Field label="Team 1 wickets" value={t1Wkts} onChange={setT1Wkts} />
          <Field label={`Team 2 overs available (${scheduled} max)`} value={t2Overs} onChange={setT2Overs} />
          <Field label="Team 2 overs faced (par)" value={t2Faced} onChange={setT2Faced} />
          <Field label="Team 2 wickets now" value={t2Wkts} onChange={setT2Wkts} />
        </div>
        <ToolCheckbox label="Team 1 all out" checked={t1AllOut} onChange={setT1AllOut} />
        <ToolError message={error} />
      </ToolPanel>
    </ToolPage>
  );
}
