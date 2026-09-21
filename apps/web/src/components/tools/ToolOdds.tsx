'use client';

import { useMemo, useState } from 'react';
import {
  americanFromDecimal,
  decimalFromAmerican,
  decimalFromFractional,
  decimalFromImplied,
  formatPct,
  impliedFromDecimal,
  overround,
  fractionalFromDecimal,
} from '../../lib/oddsMath';
import type { ToolDef } from '../../lib/toolsCatalog';
import { Field, MoreTools, ResultBox, ToolIntro, num } from './ToolShared';

export default function ToolOdds({ tool }: { tool: ToolDef }) {
  const impliedOnly = tool.kind === 'implied';
  const [mode, setMode] = useState<'decimal' | 'fractional' | 'american' | 'prob'>('decimal');
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [price2, setPrice2] = useState('');

  const converted = useMemo(() => {
    let decimal: number | null = null;
    if (impliedOnly || mode === 'prob') {
      decimal = decimalFromImplied(num(a) / 100);
    } else if (mode === 'decimal') {
      decimal = num(a) > 1 ? num(a) : null;
    } else if (mode === 'american') {
      decimal = decimalFromAmerican(Number(a));
    } else {
      decimal = decimalFromFractional(num(a), num(b));
    }
    const implied = decimal ? impliedFromDecimal(decimal) : null;
    const american = decimal ? americanFromDecimal(decimal) : null;
    const frac = decimal ? fractionalFromDecimal(decimal) : null;
    const other = price2 ? impliedFromDecimal(num(price2) > 1 ? num(price2) : 0) : null;
    const margin = implied && other ? overround([implied, other]) : null;
    return { decimal, implied, american, frac, margin };
  }, [impliedOnly, mode, a, b, price2]);

  return (
    <div className="space-y-6">
      <ToolIntro tool={tool} />
      <div className="overflow-hidden rounded-md border border-lborder bg-card">
        <div className="grid grid-cols-1 gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="space-y-4">
            {!impliedOnly && (
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stext">From</span>
                <select
                  value={mode}
                  onChange={(event) => {
                    const next = event.target.value;
                    if (next === 'decimal' || next === 'fractional' || next === 'american' || next === 'prob') {
                      setMode(next);
                    }
                  }}
                  className="w-full rounded-md border border-lborder bg-secondary px-3 py-2.5 text-sm font-semibold text-mtext outline-none focus:border-accent"
                >
                  <option value="decimal">Decimal (1.80)</option>
                  <option value="fractional">Fractional (4/5)</option>
                  <option value="american">American (−125)</option>
                  <option value="prob">Implied % (55.6)</option>
                </select>
              </label>
            )}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label={impliedOnly || mode === 'prob' ? 'Implied %' : mode === 'american' ? 'American odds' : mode === 'fractional' ? 'Numerator' : 'Decimal odds'}
                value={a}
                onChange={setA}
              />
              {mode === 'fractional' && !impliedOnly ? <Field label="Denominator" value={b} onChange={setB} /> : null}
              {impliedOnly ? <Field label="Second decimal price (margin)" value={price2} onChange={setPrice2} /> : null}
            </div>
          </div>
          <div className="space-y-3">
            <ResultBox label="Implied" value={formatPct(converted.implied)} />
            <ResultBox label="Decimal" value={converted.decimal ? converted.decimal.toFixed(3) : '—'} />
            <p className="text-xs text-stext">
              American {converted.american ?? '—'}
              {converted.frac ? ` · ${converted.frac.num}/${converted.frac.den}` : ''}
              {converted.margin !== null ? ` · margin ${(converted.margin * 100).toFixed(1)}%` : ''}
            </p>
          </div>
        </div>
      </div>
      <MoreTools currentSlug={tool.slug} />
    </div>
  );
}
