'use client';

import { useEffect, useMemo, useState } from 'react';
import { formatPct, overround } from '../../lib/oddsMath';
import type { ToolDef } from '../../lib/toolsCatalog';
import { fetchOddsMargin } from '../../services/odds';
import { Field, ToolPage, ToolPanel, ResultBox, num } from './ToolShared';

export default function ToolBookmakerMargin({ tool }: { tool: ToolDef }) {
  const [price1, setPrice1] = useState('1.91');
  const [price2, setPrice2] = useState('1.91');
  const [price3, setPrice3] = useState('');
  const [apiMargin, setApiMargin] = useState<number | null | undefined>(undefined);
  const [apiError, setApiError] = useState(false);

  const decimals = useMemo(() => {
    const rows = [price1, price2, price3]
      .map((raw) => num(raw))
      .filter((n) => n > 1);
    return rows;
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

  const margin = apiError ? localMargin : apiMargin !== undefined ? apiMargin : localMargin;

  return (
    <ToolPage tool={tool}>
      <ToolPanel
        aside={
          <>
            <ResultBox label="Bookmaker margin" value={margin !== null && margin !== undefined ? formatPct(margin) : '—'} />
            {apiError ? (
              <p className="text-xs text-stext">Could not reach the server — showing a local estimate.</p>
            ) : null}
          </>
        }
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Outcome 1 (decimal)" value={price1} onChange={setPrice1} />
          <Field label="Outcome 2 (decimal)" value={price2} onChange={setPrice2} />
          <Field label="Outcome 3 (optional)" value={price3} onChange={setPrice3} />
        </div>
      </ToolPanel>
    </ToolPage>
  );
}
