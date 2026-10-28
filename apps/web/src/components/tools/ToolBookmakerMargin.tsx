'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatPct, overround } from '../../lib/oddsMath';
import type { ToolDef } from '../../lib/toolsCatalog';
import { fetchOddsMargin } from '../../services/odds';
import { Field, ToolError, ToolPage, ToolPanel, ResultBox } from './ToolShared';
import { firstError, readNumber } from './toolInputs';

export default function ToolBookmakerMargin({ tool }: { tool: ToolDef }) {
  const [price1, setPrice1] = useState('1.91');
  const [price2, setPrice2] = useState('1.91');
  const [price3, setPrice3] = useState('');
  const [apiMargin, setApiMargin] = useState<number | null | undefined>(undefined);
  const [apiError, setApiError] = useState(false);

  const reset = () => {
    setPrice1('');
    setPrice2('');
    setPrice3('');
  };

  // A decimal price is above 1.00; anything else typed is pointed out, not dropped.
  const { decimals, error } = useMemo(() => {
    const inputs = [price1, price2, price3].map((raw, index) =>
      readNumber(raw, `Outcome ${index + 1}`, { min: 1.01 })
    );
    const invalid = firstError(...inputs);
    if (invalid) return { decimals: [] as number[], error: invalid };
    return { decimals: inputs.flatMap((input) => (input.value === null ? [] : [input.value])), error: null };
  }, [price1, price2, price3]);

  const localMargin = useMemo(() => {
    const implied = decimals.map((d) => 1 / d);
    return implied.length >= 2 ? overround(implied) : null;
  }, [decimals]);

  useEffect(() => {
    if (decimals.length < 2) {
      setApiMargin(undefined);
      setApiError(false);
      return;
    }
    let cancelled = false;
    setApiMargin(undefined);
    setApiError(false);
    void fetchOddsMargin(decimals)
      .then((res) => {
        if (!cancelled) setApiMargin(res?.margin ?? null);
      })
      .catch(() => {
        if (!cancelled) {
          setApiError(true);
          setApiMargin(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [decimals]);

  // A missing API answer (null) never replaces the local figure; both are the overround.
  const margin = !apiError && typeof apiMargin === 'number' ? apiMargin : localMargin;

  return (
    <ToolPage tool={tool}>
      <ToolPanel
        onReset={reset}
        aside={
          <>
            <ResultBox
              label="Bookmaker margin (overround)"
              value={margin !== null && margin !== undefined ? formatPct(margin) : '—'}
              hint="How far the chances in these prices add up past 100%. Lower is better for you."
            />
            {apiError ? (
              <p className="text-xs text-stext">We could not check this online — showing a quick estimate.</p>
            ) : null}
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Outcome 1 (decimal)" value={price1} onChange={setPrice1} />
          <Field label="Outcome 2 (decimal)" value={price2} onChange={setPrice2} />
          <Field label="Outcome 3 (optional)" value={price3} onChange={setPrice3} />
        </div>
        <ToolError message={error} />
      </ToolPanel>
    </ToolPage>
  );
}
