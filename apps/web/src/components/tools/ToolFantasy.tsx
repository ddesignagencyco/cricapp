'use client';

import { useMemo, useState } from 'react';
import { fantasyPoints, type FantasyFormat, type FantasyLine } from '../../lib/fantasyMath';
import type { ToolDef } from '../../lib/toolsCatalog';
import { Field, SelectField, ToolCheckbox, ToolPage, ToolPanel, ResultBox, num } from './ToolShared';

const XI_SLOTS = 11;

function lineFromFields(fields: Record<string, string>, dismissed: boolean): FantasyLine {
  return {
    runs: num(fields.runs),
    balls: num(fields.balls),
    fours: num(fields.fours),
    sixes: num(fields.sixes),
    dismissed,
    wickets: num(fields.wickets),
    overs: num(fields.overs),
    maidens: num(fields.maidens),
    bowlRuns: num(fields.bowlRuns),
    catches: num(fields.catches),
    stumpings: num(fields.stumpings),
    runOuts: num(fields.runOuts),
  };
}

export default function ToolFantasy({ tool }: { tool: ToolDef }) {
  const [format, setFormat] = useState<FantasyFormat>('t20');
  const [dismissed, setDismissed] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [xi, setXi] = useState<string[]>(() => Array.from({ length: XI_SLOTS }, () => ''));

  const setField = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const playerPts = useMemo(
    () => fantasyPoints(lineFromFields(fields, dismissed), format),
    [fields, dismissed, format]
  );

  const xiTotal = useMemo(() => {
    return xi.reduce((sum, value) => sum + (Number(value) || 0), 0);
  }, [xi]);

  return (
    <ToolPage
      tool={tool}
      note="Informational Dream11-style scoring (runs, boundaries, wickets, fielding, SR/economy bands). Not an official contest and not linked to a live XI API."
    >
      <ToolPanel aside={<ResultBox label="Player points" value={String(playerPts)} />}>
        <SelectField label="Format" value={format} onChange={(v) => setFormat(v === 'odi' ? 'odi' : 't20')}>
          <option value="t20">T20</option>
          <option value="odi">ODI</option>
        </SelectField>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Runs" value={fields.runs || ''} onChange={(v) => setField('runs', v)} />
          <Field label="Balls" value={fields.balls || ''} onChange={(v) => setField('balls', v)} />
          <Field label="Fours" value={fields.fours || ''} onChange={(v) => setField('fours', v)} />
          <Field label="Sixes" value={fields.sixes || ''} onChange={(v) => setField('sixes', v)} />
          <Field label="Wickets" value={fields.wickets || ''} onChange={(v) => setField('wickets', v)} />
          <Field label="Overs bowled" value={fields.overs || ''} onChange={(v) => setField('overs', v)} />
          <Field label="Maidens" value={fields.maidens || ''} onChange={(v) => setField('maidens', v)} />
          <Field label="Bowling runs" value={fields.bowlRuns || ''} onChange={(v) => setField('bowlRuns', v)} />
          <Field label="Catches" value={fields.catches || ''} onChange={(v) => setField('catches', v)} />
          <Field label="Stumpings" value={fields.stumpings || ''} onChange={(v) => setField('stumpings', v)} />
          <Field label="Run outs" value={fields.runOuts || ''} onChange={(v) => setField('runOuts', v)} />
        </div>
        <ToolCheckbox label="Dismissed (duck = −2 if 0 runs)" checked={dismissed} onChange={setDismissed} />
      </ToolPanel>

      <div className="tool-page-panel">
        <div className="p-4 sm:p-6">
          <h2 className="text-sm font-bold text-mtext">Informational XI</h2>
          <p className="mt-1 text-xs text-stext">
            Paste or type each player&apos;s points. Total is a sum only — no salary cap API.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {xi.map((value, index) => (
              <Field
                key={`xi-${index + 1}`}
                label={`Player ${index + 1}`}
                value={value}
                onChange={(next) => {
                  setXi((prev) => prev.map((item, i) => (i === index ? next : item)));
                }}
              />
            ))}
          </div>
          <div className="tool-result-hero mt-4 max-w-xs">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stext">XI total</p>
            <p className="tool-result-hero__value mt-2 font-mono text-2xl font-black tabular-nums text-accent">
              {xiTotal}
            </p>
          </div>
        </div>
      </div>
    </ToolPage>
  );
}
