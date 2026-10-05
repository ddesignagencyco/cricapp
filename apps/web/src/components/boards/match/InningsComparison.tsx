'use client';

import { BarChart3 } from 'lucide-react';
import { MatchSectionCard } from './MatchSectionCard';
import TeamLogo from '../../TeamLogo';
import { ordinalInnings, rate } from './matchFormat';
import type { MatchViewModel } from '../../../lib/matchViewModel';

/**
 * Every innings in the match, as a plain table.
 *
 * There used to be a proportional bar beside each score, sized against the largest
 * innings in the match. It was defensible — ranking innings within one match is the only
 * comparison that means anything for a Test, where the two sides never bat the same
 * innings — but it was a decoration that carried no number, and it sat in the Score
 * column pushing the score off-centre. The score is the reason the row exists.
 */
export default function InningsComparison({ view }: { view: MatchViewModel }) {
  if (view.innings.length === 0) return null;

  return (
    <MatchSectionCard icon={BarChart3} title="Innings Comparison">
      <div className="mc-table-wrap">
        <div className="table-scroll">
          <table className="w-full min-w-[440px] text-sm">
            <caption className="sr-only">
              Each innings in this match, with runs, wickets, overs and run rate.
            </caption>
            <colgroup>
              <col />
              <col className="w-[9rem]" />
              <col className="w-[5rem]" />
              <col className="w-[5rem]" />
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
                    <td className="tabular-nums text-mtext">{inn.score || '—'}</td>
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
