'use client';

import { BarChart3 } from 'lucide-react';
import { MatchSectionCard } from './MatchSectionCard';
import TeamLogo from '../../TeamLogo';
import { ordinalInnings, rate } from './matchFormat';
import type { MatchViewModel } from '../../../lib/matchViewModel';

/**
 * Every innings in the match, with a proportional bar.
 *
 * ## What the bar is scaled against
 *
 * Each bar is sized against the **largest innings in this match**, and the bar
 * carries a title attribute saying so.
 *
 * The obvious alternative — each innings as a percentage of the other side's — is
 * wrong for anything that is not a one-innings-per-side match. In a Test the two
 * sides never bat the same innings: India made 150 and 487, Australia 104 and 238.
 * Pairing innings 1 against innings 2 to draw "78% vs 22%" compares a first innings
 * with a second innings, which is not a comparison any reader would make or mean.
 *
 * So the bar ranks the innings within the match and the score is always printed
 * beside it. The bar never stands in for a number.
 */
export default function InningsComparison({ view }: { view: MatchViewModel }) {
  if (view.innings.length === 0) return null;

  const maxRuns = view.innings.reduce((max, inn) => Math.max(max, inn.runs ?? 0), 0);

  return (
    <MatchSectionCard icon={BarChart3} title="Innings Comparison">
      <div className="mc-table-wrap">
        <div className="table-scroll">
          <table className="w-full min-w-[440px] table-fixed text-sm">
            <caption className="sr-only">
              Each innings in this match, with runs, wickets, overs and run rate. Bars are
              sized against the highest innings total in the match.
            </caption>
            <colgroup>
              <col className="w-[34%]" />
              <col className="w-[30%]" />
              <col className="w-[18%]" />
              <col className="w-[18%]" />
            </colgroup>
            <thead>
              <tr className="mc-table__head">
                <th scope="col" className="text-left">Team</th>
                <th scope="col" className="text-left">Score</th>
                <th scope="col" className="text-right">Overs</th>
                <th scope="col" className="text-right">RR</th>
              </tr>
            </thead>
            <tbody>
              {view.innings.map((inn) => {
                const isHome = inn.side === 'home';
                const team = isHome ? view.home : view.away;
                const label = team.name || (isHome ? 'Home' : 'Away');
                const percent = maxRuns > 0 ? Math.round(((inn.runs ?? 0) / maxRuns) * 100) : 0;
                return (
                  <tr key={inn.number} className="mc-table__row">
                    <th scope="row" className="mc-compare__team">
                      <span className="flex min-w-0 items-center gap-2">
                        <TeamLogo
                          code={team.code}
                          name={label}
                          teamId={team.id ?? undefined}
                          size="xs"
                          link={false}
                          className="h-5 w-5 shrink-0"
                        />
                        <span className="min-w-0">
                          <span className="block truncate font-semibold text-mtext">{label}</span>
                          <span className="block text-[10px] uppercase tracking-wider text-stext">
                            {ordinalInnings(inn.number)} innings
                          </span>
                        </span>
                      </span>
                    </th>
                    <td className="mc-compare__bar-cell">
                      <span
                        className="mc-bar"
                        style={{ width: `${Math.max(percent, inn.runs ? 8 : 0)}%` }}
                        role="img"
                        aria-label={`${label} made ${inn.runs ?? 0} runs in the ${ordinalInnings(inn.number)} innings`}
                        title={`${inn.runs ?? 0} runs — ${percent}% of the highest innings in this match`}
                      />
                      <span className="tabular-nums text-mtext">{inn.score || '—'}</span>
                    </td>
                    <td className="mc-compare__num tabular-nums">{inn.oversLabel || '—'}</td>
                    <td className="mc-compare__num tabular-nums">{rate(inn.runRate)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </MatchSectionCard>
  );
}
