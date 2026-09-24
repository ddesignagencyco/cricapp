'use client';

import { Scale } from 'lucide-react';
import { formatOddsPrice } from '../../lib/oddsDisplay';
import type { MatchOddsResponse } from '../../types/odds';

interface Props {
  data: MatchOddsResponse;
  homeLabel: string;
  awayLabel: string;
  onOpen: () => void;
}

function bestPrice(
  market: MatchOddsResponse['markets'][0] | undefined,
  key: 'home' | 'away',
): string {
  if (!market) return '—';
  const rows = market.selections.filter((row) => row.selectionKey === key);
  const best = rows.find((row) => row.isBestDisplayedPrice) ?? rows[0];
  if (!best) return '—';
  return formatOddsPrice(best.current, 'decimal');
}

export default function MatchOddsTeaser({ data, homeLabel, awayLabel, onOpen }: Props) {
  const market = data.markets.find((m) => m.marketKey === 'match_winner') ?? data.markets[0];
  if (!market) return null;

  return (
    <div className="card-diamond rounded-md border border-lborder bg-card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-stext">Match odds</p>
        <Scale size={14} className="text-accent" aria-hidden />
      </div>
      <ul className="mt-3 space-y-2 text-sm">
        <li className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate font-semibold text-mtext">{homeLabel}</span>
          <span className="font-mono font-bold tabular-nums text-accent">{bestPrice(market, 'home')}</span>
        </li>
        <li className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate font-semibold text-mtext">{awayLabel}</span>
          <span className="font-mono font-bold tabular-nums text-accent">{bestPrice(market, 'away')}</span>
        </li>
      </ul>
      <button
        type="button"
        onClick={onOpen}
        className="mt-3 text-xs font-semibold text-accent hover:underline"
      >
        Full comparison →
      </button>
    </div>
  );
}
