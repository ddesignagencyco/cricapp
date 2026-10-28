'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  americanFromDecimal,
  decimalFromAmerican,
  decimalFromFractional,
  formatPct,
  impliedFromDecimal,
  fractionalFromDecimal,
  fractionalQuery,
} from '../../lib/oddsMath';
import type { ToolDef } from '../../lib/toolsCatalog';
import type { OddsConvertResponse } from '../../types/odds';
import { convertOdds } from '../../services/odds';
import { Field, SelectField, ToolPage, ToolPanel, ResultBox, num } from './ToolShared';

export default function ToolOdds({ tool }: { tool: ToolDef }) {
  const [mode, setMode] = useState<'decimal' | 'fractional' | 'american'>('decimal');
  const [a, setA] = useState('2.5');
  const [b, setB] = useState('2');
  // Keyed by the query it answered, so a reply for an older input is never shown.
  const [apiResult, setApiResult] = useState<{ key: string; res: OddsConvertResponse | null } | null>(null);
  const [apiPending, setApiPending] = useState(false);
  const [apiError, setApiError] = useState(false);

  const queryValue = useMemo(() => {
    if (mode === 'fractional') return fractionalQuery(num(a), num(b));
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
          setApiResult({ key: `${mode}:${queryValue}`, res });
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

  // The API only confirms the local answer: a stale, missing or disagreeing reply
  // falls back to the formula rather than replacing a correct number.
  const current = apiResult?.key === `${mode}:${queryValue}` ? apiResult.res : null;
  const api =
    current && local.decimal !== null && Math.abs(current.decimal - local.decimal) < 1e-6 ? current : null;
  const decimal = api?.decimal ?? local.decimal;
  const implied = api?.formats?.impliedProbability ?? local.implied;
  const american = api?.formats?.american ?? local.american;
  const fractional = api?.formats?.fractional || (local.frac ? `${local.frac.num}/${local.frac.den}` : null);

  return (
    <ToolPage tool={tool}>
      <ToolPanel
        aside={
          <>
            <ResultBox
              label="Chance this wins"
              value={formatPct(implied)}
              hint="What the price is telling you. A price of 2.00 means a 50% chance."
            />
            <ResultBox label="Decimal price" value={decimal ? decimal.toFixed(3) : '—'} />
            {apiPending || apiError ? (
              <p className="text-xs text-stext">
                {apiPending ? 'Updating…' : 'We could not check this online — showing a quick estimate.'}
              </p>
            ) : null}
            <p className="text-xs text-stext">
              American {american ?? '—'}
              {fractional ? ` · ${fractional}` : ''}
            </p>
          </>
        }
      >
        <SelectField
          label="From"
          value={mode}
          onChange={(next) => {
            if (next === 'decimal' || next === 'fractional' || next === 'american') setMode(next);
          }}
        >
          <option value="decimal">Decimal (2.50)</option>
          <option value="fractional">Fractional (5/2)</option>
          <option value="american">American (+150)</option>
        </SelectField>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field
            label={mode === 'american' ? 'American odds' : mode === 'fractional' ? 'Numerator' : 'Decimal odds'}
            value={a}
            onChange={setA}
          />
          {mode === 'fractional' ? <Field label="Denominator" value={b} onChange={setB} /> : null}
        </div>
      </ToolPanel>
    </ToolPage>
  );
}
