'use client';

import { ClipboardList } from 'lucide-react';
import { MatchSectionCard } from './MatchSectionCard';
import { PlayerLink } from '../../EntityLinks';
import { rate } from './matchFormat';
import type { BatterFigure, BowlerFigure } from '../../../lib/matchPerformers';

/**
 * The three best batters and the three leading bowlers, with a route into the full
 * scorecard.
 *
 * These are the same figures the full scorecard shows, taken from the same
 * aggregation, so the highlight can never disagree with the table it links to.
 */
export default function ScorecardHighlights({
  batters,
  bowlers,
  onViewScorecard,
  viewAllHref,
}: {
  batters: BatterFigure[];
  bowlers: BowlerFigure[];
  onViewScorecard?: () => void;
  viewAllHref?: string | null;
}) {
  if (batters.length === 0 && bowlers.length === 0) return null;

  const action =
    onViewScorecard && (batters.length > 0 || bowlers.length > 0)
      ? { href: '#mc-scorecard-full', label: 'View Full Scorecard' }
      : viewAllHref
        ? { href: viewAllHref, label: 'View Full Scorecard' }
        : null;

  return (
    <MatchSectionCard icon={ClipboardList} title="Scorecard Highlights" action={action}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {batters.length > 0 ? (
          <div className="min-w-0">
            <p className="mc-table__title">Top batters</p>
            {/*
              The headings are spelled out rather than abbreviated to `R`/`B`/`4s`.
              A column headed `B` above the figure `305` is a guess the reader has to
              make; a column headed `Balls` is not. The widths are fixed so each
              heading sits over its own values instead of drifting into the next.
            */}
            <div className="mc-table-wrap">
              <div className="table-scroll">
                <table className="w-full min-w-[460px] text-sm">
                  <caption className="sr-only">
                    Leading batters with runs, balls, fours, sixes and strike rate.
                  </caption>
                  <colgroup>
                    <col />
                    <col className="w-[3.75rem]" />
                    <col className="w-[3.75rem]" />
                    <col className="w-[3rem]" />
                    <col className="w-[3rem]" />
                    <col className="w-[4.25rem]" />
                  </colgroup>
                  <thead>
                    <tr className="mc-table__head">
                      <th scope="col" className="text-left">Batter</th>
                      <th scope="col" className="text-right">Runs</th>
                      <th scope="col" className="text-right">Balls</th>
                      <th scope="col" className="text-right">4s</th>
                      <th scope="col" className="text-right">6s</th>
                      <th scope="col" className="text-right">SR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batters.map((row) => (
                      <tr key={row.id || row.name} className="mc-table__row">
                        <th scope="row" className="mc-cell-name">
                          <PlayerLink
                            playerId={row.id}
                            name={row.name}
                            className="font-semibold text-mtext hover:text-accent"
                          />
                        </th>
                        <td className="mc-cell-num mc-cell-num--lead tabular-nums">{row.runs}</td>
                        <td className="mc-cell-num tabular-nums">{row.balls}</td>
                        <td className="mc-cell-num tabular-nums">{row.fours}</td>
                        <td className="mc-cell-num tabular-nums">{row.sixes}</td>
                        <td className="mc-cell-num tabular-nums">{row.strikeRate.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}

        {bowlers.length > 0 ? (
          <div className="min-w-0">
            <p className="mc-table__title">Leading bowlers</p>
            <div className="mc-table-wrap">
              <div className="table-scroll">
                <table className="w-full min-w-[460px] text-sm">
                  <caption className="sr-only">
                    Leading bowlers with overs, maidens, runs, wickets and economy.
                  </caption>
                  <colgroup>
                    <col />
                    <col className="w-[3.75rem]" />
                    <col className="w-[3.75rem]" />
                    <col className="w-[3.75rem]" />
                    <col className="w-[3.75rem]" />
                    <col className="w-[4.25rem]" />
                  </colgroup>
                  <thead>
                    <tr className="mc-table__head">
                      <th scope="col" className="text-left">Bowler</th>
                      <th scope="col" className="text-right">Overs</th>
                      <th scope="col" className="text-right">Mdns</th>
                      <th scope="col" className="text-right">Runs</th>
                      <th scope="col" className="text-right">Wkts</th>
                      <th scope="col" className="text-right">Econ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bowlers.map((row) => (
                      <tr key={row.id || row.name} className="mc-table__row">
                        <th scope="row" className="mc-cell-name">
                          <PlayerLink
                            playerId={row.id}
                            name={row.name}
                            className="font-semibold text-mtext hover:text-accent"
                          />
                        </th>
                        <td className="mc-cell-num tabular-nums">{row.overs}</td>
                        <td className="mc-cell-num tabular-nums">{row.maidens}</td>
                        <td className="mc-cell-num tabular-nums">{row.runs}</td>
                        <td className="mc-cell-num mc-cell-num--lead tabular-nums">{row.wickets}</td>
                        <td className="mc-cell-num tabular-nums">{rate(row.economy)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      {onViewScorecard ? (
        <button type="button" onClick={onViewScorecard} className="mc-btn-ghost mt-4 w-full sm:hidden">
          View Full Scorecard
        </button>
      ) : null}
    </MatchSectionCard>
  );
}
