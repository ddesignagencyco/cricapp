'use client';

import { useState } from 'react';
import { TrendingDown } from 'lucide-react';
import { MatchSectionCard } from './MatchSectionCard';
import { ordinalInnings } from './matchFormat';
import type { FallOfWicketEntry } from '../../../lib/matchScorecardData';
import type { MatchInnings } from '../../../lib/matchInnings';

/**
 * The fall of wickets for every innings, with the last one open.
 *
 * Each wicket is a real dismissal from the scorecard, at the over it happened in.
 * The score beside it comes from the ball-by-ball `display_score` on that wicket, and
 * is omitted where the payload does not carry one — an over and a batter name are
 * still worth showing, whereas a guessed score would not be.
 *
 * The chips are a row that scrolls horizontally rather than wrapping into a tall
 * block, so a four-innings Test's forty wickets stay a strip rather than pushing the
 * rest of the overview off the screen.
 */
export default function FallOfWickets({
  entries,
  innings,
  sideName,
}: {
  /** Keyed by innings number. */
  entries: Map<number, FallOfWicketEntry[]>;
  innings: MatchInnings[];
  sideName: (_side: MatchInnings['side']) => string;
}) {
  const inningsNumbers = innings.filter((inn) => (entries.get(inn.number)?.length ?? 0) > 0);
  if (inningsNumbers.length === 0) return null;

  return (
    <MatchSectionCard
      icon={TrendingDown}
      title="Fall of Wickets"
      description={inningsNumbers.length > 1 ? 'Every innings, in order' : undefined}
    >
      <div className="space-y-3">
        {inningsNumbers.map((inn) => {
          const wickets = entries.get(inn.number) ?? [];
          const team = sideName(inn.side);
          return (
            <div key={inn.number} className="min-w-0">
              <p className="mb-1.5 text-[11px] font-semibold text-stext">
                <span className="text-mtext">{ordinalInnings(inn.number)} innings</span>
                {team ? ` · ${team}` : ''}
                {inn.score ? (
                  <>
                    {' · '}
                    <span className="tabular-nums">{inn.score}</span>
                    {inn.oversLabel ? (
                      <span className="tabular-nums"> ({inn.oversLabel} ov)</span>
                    ) : null}
                  </>
                ) : null}
              </p>
              <WicketStrip wickets={wickets} />
            </div>
          );
        })}
      </div>
    </MatchSectionCard>
  );
}

function WicketStrip({ wickets }: { wickets: FallOfWicketEntry[] }) {
  const [expanded, setExpanded] = useState(false);
  const limit = 6;
  const shown = expanded ? wickets : wickets.slice(0, limit);
  const hidden = wickets.length - shown.length;

  return (
    <>
      {/*
        A wrapping grid, not a horizontal scroller.

        It was a single-line scroller with negative side margins, which clipped the
        first and last chip against the card edge and hid the rest of the innings
        behind an invisible scroll — a reader could see six of ten wickets and no
        indication that four more existed. `repeat(auto-fill, minmax(...))` reflows
        instead, so every wicket is present in the layout and nothing is cut off.
      */}
      <ul className="mc-fow-grid">
        {shown.map((wicket) => (
          <li key={wicket.wicket} className="mc-fow">
            <span className="mc-fow__runs tabular-nums">
              {wicket.score ?? `${wicket.wicket}/${wicket.wicket}`}
            </span>
            <span className="mc-fow__overs tabular-nums">({wicket.overs} ov)</span>
            <span className="mc-fow__batter" title={`${wicket.batter} — ${humanDismissal(wicket)}`}>
              {wicket.batter}
            </span>
          </li>
        ))}
      </ul>
      {hidden > 0 || expanded ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mc-btn-ghost mt-2 px-2.5 py-1 text-[11px]"
          aria-expanded={expanded}
        >
          {expanded ? 'Show fewer' : `Show all ${wickets.length} wickets`}
        </button>
      ) : null}
    </>
  );
}

/** `leg_before_wicket` reads better as "lbw b …". */
function humanDismissal(wicket: FallOfWicketEntry): string {
  const type = wicket.dismissal.replace(/_/g, ' ').trim();
  const bowler = wicket.bowler ? ` ${wicket.bowler}` : '';
  return `${type}${bowler}`;
}
