'use client';

import { MATCH_WINNER_IMPORTANT_NOTES, MATCH_WINNER_SETTLEMENT } from '../../lib/oddsMarketRules';

interface Props {
  marketKey: string;
}

export default function OddsMarketRulesDisclosure({ marketKey }: Props) {
  if (marketKey !== 'match_winner') return null;

  return (
    <details className="rounded-xl bg-secondary/70 ring-1 ring-lborder">
      <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-mtext">
        How this market is settled
      </summary>
      <div className="space-y-4 border-t border-lborder px-4 py-4 text-sm leading-relaxed text-stext">
        <p>{MATCH_WINNER_SETTLEMENT}</p>
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-mtext">Important</p>
          <ul className="list-disc space-y-2 pl-5">
            {MATCH_WINNER_IMPORTANT_NOTES.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </div>
      </div>
    </details>
  );
}
