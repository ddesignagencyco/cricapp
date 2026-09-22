'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  americanFromDecimal,
  decimalFromAmerican,
  decimalFromFractional,
  formatPct,
  impliedFromDecimal,
  fractionalFromDecimal,
} from '../../lib/oddsMath';
import type { ToolDef } from '../../lib/toolsCatalog';
import type { OddsConvertResponse } from '../../types/odds';
import { convertOdds } from '../../services/odds';
import { Field, MoreTools, ResultBox, ToolIntro, num } from './ToolShared';

export default function ToolOdds({ tool }: { tool: ToolDef }) {
  const [mode, setMode] = useState<'decimal' | 'fractional' | 'american'>('decimal');
  const [a, setA] = useState('2.5');
  const [b, setB] = useState('2');
  const [apiResult, setApiResult] = useState<OddsConvertResponse | null>(null);
  const [apiPending, setApiPending] = useState(false);
  const [apiError, setApiError] = useState(false);

  const queryValue = useMemo(() => {
    if (mode === 'fractional') {
      const numVal = num(a);
      const denVal = num(b);
      if (numVal <= 0 || denVal <= 0) return '';
      return `${Math.round(numVal)}/${Math.round(denVal)}`;
    }
    return a.trim();
  }, [mode, a, b]);

  const local = useMemo(() => {
    let decimal: number | null = null;
    if (mode === 'decimal') {
      decimal = num(a) > 1 ? num(a) : null;
    } else if (mode === 'american') {
      decimal = decimalFromAmerican(Number(a));
    } else {
      decimal = decimalFromFractional(num(a), num(b));
    }
    const implied = decimal ? impliedFromDecimal(decimal) : null;
    const american = decimal ? americanFromDecimal(decimal) : null;
    const frac = decimal ? fractionalFromDecimal(decimal) : null;
    return { decimal, implied, american, frac };
  }, [mode, a, b]);

  useEffect(() => {
    if (!queryValue) {
      setApiResult(null);
      setApiError(false);
      return;
    }
    let cancelled = false;
    setApiPending(true);
    setApiError(false);
    const timer = window.setTimeout(() => {
      void convertOdds(mode, queryValue)
        .then((res) => {
          if (cancelled) return;
          setApiResult(res);
          if (!res) setApiError(true);
        })
        .catch(() => {
          if (!cancelled) setApiError(true);
        })
        .finally(() => {
          if (!cancelled) setApiPending(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [mode, queryValue]);

  const decimal = apiResult?.decimal ?? local.decimal;
  const implied = apiResult?.formats?.impliedProbability ?? local.implied;
  const american = apiResult?.formats?.american ?? local.american;
  const fractional =
    apiResult?.formats?.fractional ?? (local.frac ? `${local.frac.num}/${local.frac.den}` : null);

  return (
    <div className="space-y-6">
      <ToolIntro tool={tool} />
      <div className="overflow-hidden rounded-md border border-lborder bg-card">
        <div className="grid grid-cols-1 gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-stext">From</span>
              <select
                value={mode}
                onChange={(event) => {
                  const next = event.target.value;
                  if (next === 'decimal' || next === 'fractional' || next === 'american') {
                    setMode(next);
                  }
                }}
                className="w-full rounded-md border border-lborder bg-secondary px-3 py-2.5 text-sm font-semibold text-mtext outline-none focus:border-accent"
              >
                <option value="decimal">Decimal (2.50)</option>
                <option value="fractional">Fractional (5/2)</option>
                <option value="american">American (+150)</option>
              </select>
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                label={
                  mode === 'american' ? 'American odds' : mode === 'fractional' ? 'Numerator' : 'Decimal odds'
                }
                value={a}
                onChange={setA}
              />
              {mode === 'fractional' ? <Field label="Denominator" value={b} onChange={setB} /> : null}
            </div>
          </div>
          <div className="space-y-3">
            <ResultBox label="Implied probability" value={formatPct(implied)} />
            <ResultBox label="Decimal" value={decimal ? decimal.toFixed(3) : '—'} />
            {apiPending || apiError ? (
              <p className="text-xs text-stext">
                {apiPending ? 'Updating…' : 'Could not convert — showing a local estimate.'}
              </p>
            ) : null}
            <p className="text-xs text-stext">
              American {american ?? '—'}
              {fractional ? ` · ${fractional}` : ''}
            </p>
          </div>
        </div>
      </div>
      <MoreTools currentSlug={tool.slug} />
    </div>
  );
}
