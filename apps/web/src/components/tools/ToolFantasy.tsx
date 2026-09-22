'use client';

import { useMemo, useState } from 'react';
import { fantasyPoints, type FantasyFormat, type FantasyLine } from '../../lib/fantasyMath';
import type { ToolDef } from '../../lib/toolsCatalog';
import { Field, MoreTools, ResultBox, ToolIntro, num } from './ToolShared';

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
    <div className="space-y-6">
      <ToolIntro tool={tool} />
      <p className="text-xs text-stext">
        Informational Dream11-style scoring (runs, boundaries, wickets, fielding, SR/economy bands). Not an official contest and not linked to a live XI API.
      </p>
      <div className="overflow-hidden rounded-md border border-lborder bg-card">
        <div className="grid grid-cols-1 gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stext">Format</span>
              <select
                value={format}
                onChange={(event) => setFormat(event.target.value === 'odi' ? 'odi' : 't20')}
                className="w-full rounded-md border border-lborder bg-secondary px-3 py-2.5 text-sm font-semibold text-mtext outline-none focus:border-accent"
              >
                <option value="t20">T20</option>
                <option value="odi">ODI</option>
              </select>
            </label>
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
            <label className="flex items-center gap-2 text-sm text-mtext">
              <input type="checkbox" checked={dismissed} onChange={(event) => setDismissed(event.target.checked)} />
              Dismissed (duck = −2 if 0 runs)
            </label>
          </div>
          <ResultBox label="Player points" value={String(playerPts)} />
        </div>
      </div>
      <div className="rounded-md border border-lborder bg-card p-4 sm:p-5">
        <h2 className="text-sm font-bold text-mtext">Informational XI</h2>
        <p className="mt-1 text-xs text-stext">Paste or type each player&apos;s points. Total is a sum only — no salary cap API.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
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
        <p className="mt-4 font-mono text-lg font-black text-accent">XI total {xiTotal}</p>
      </div>
      <MoreTools currentSlug={tool.slug} />
    </div>
  );
}
