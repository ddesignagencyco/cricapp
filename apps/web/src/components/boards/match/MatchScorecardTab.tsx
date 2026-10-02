'use client';

import { ClipboardList, Users } from 'lucide-react';
import EmptyState from '../../EmptyState';
import { MatchSectionCard } from './MatchSectionCard';
import { PlayerLink } from '../../EntityLinks';
import { Skeleton } from '../../skeletons/Skeletons';
import { ordinalInnings, rate } from './matchFormat';
import type { InningsScorecard } from '../../../lib/matchCentreData';
import type { MatchViewModel } from '../../../lib/matchViewModel';
import type { SquadEntry } from '../../../lib/matchScorecardData';

/**
 * The full scorecard, one block per innings.
 *
 * Every table scrolls **inside its own card** on a phone, so a nine-column scorecard
 * never forces the page itself sideways. `min-w-0` on the grid track is what makes
 * that work: without it the table's intrinsic width wins and the whole document
 * overflows.
 */
export function MatchScorecardTab({
  cards,
  view,
  loading,
}: {
  cards: InningsScorecard[];
  view: MatchViewModel;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        {[0, 1].map((i) => (
          <MatchSectionCard key={i} icon={ClipboardList} title="Scorecard">
            <Skeleton count={6} height={20} />
          </MatchSectionCard>
        ))}
      </div>
    );
  }

  if (cards.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="Scorecard not published yet"
        message={
          view.isUpcoming
            ? 'The full scorecard appears once this fixture has been played.'
            : 'The provider has not published a scorecard for this fixture.'
        }
      />
    );
  }

  return (
    <div id="mc-scorecard-full" className="space-y-4">
      {cards.map((card) => {
        const innings = view.innings.find((inn) => inn.number === card.number);
        const team = card.battingTeam;
        return (
          <MatchSectionCard
            key={`${card.number}-${card.battingTeam}`}
            icon={ClipboardList}
            title={`${ordinalInnings(card.number)} innings · ${team}`}
            description={
              innings?.score
                ? `${innings.score}${innings.oversLabel ? ` (${innings.oversLabel} ov)` : ''}${
                    innings.runRate ? ` · RR ${rate(innings.runRate)}` : ''
                  }`
                : undefined
            }
          >
            <div className="space-y-4">
              {card.batting.length > 0 ? (
                <div className="min-w-0">
                  <p className="mc-table__title">
                    Batting — {team}
                  </p>
                  <ScoreTable
                    caption={`Batting card for ${team}, ${ordinalInnings(card.number)} innings`}
                    headers={['Batter', 'R', 'B', '4s', '6s', 'SR']}
                    firstHeader="Batter"
                    rows={card.batting.map((row) => ({
                      key: String(row.id ?? row.name),
                      name: row.name,
                      id: row.id,
                      cells: [num(row.runs), num(row.balls), num(row.fours), num(row.sixes), num(row.sr)],
                      out: row.out,
                    }))}
                  />
                </div>
              ) : null}

              {card.bowling.length > 0 ? (
                <div className="min-w-0">
                  <p className="mc-table__title">
                    Bowling — {card.bowlingTeam}
                  </p>
                  <ScoreTable
                    caption={`Bowling card for ${card.bowlingTeam}, ${ordinalInnings(card.number)} innings`}
                    headers={['Bowler', 'O', 'M', 'R', 'W', 'Econ']}
                    firstHeader="Bowler"
                    rows={card.bowling.map((row) => ({
                      key: String(row.id ?? row.name),
                      name: row.name,
                      id: row.id,
                      cells: [num(row.overs), num(row.maidens), num(row.runs), num(row.wickets), num(row.econ)],
                    }))}
                  />
                </div>
              ) : null}

              {card.batting.length === 0 && card.bowling.length === 0 ? (
                <p className="text-sm text-stext">No player rows for this innings.</p>
              ) : null}
            </div>
          </MatchSectionCard>
        );
      })}
    </div>
  );
}

function num(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  return String(value);
}

function ScoreTable({
  caption,
  headers,
  firstHeader,
  rows,
}: {
  caption: string;
  headers: string[];
  firstHeader: string;
  rows: Array<{ key: string; name: string; id?: string; cells: string[]; out?: boolean }>;
}) {
  return (
    <div className="mc-table-wrap table-scroll">
      <table className="w-full min-w-[360px] table-fixed text-sm">
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          <col className="w-[40%]" />
          {headers.slice(1).map((header) => (
            <col key={header} className="w-[12%]" />
          ))}
        </colgroup>
        <thead>
          <tr className="mc-table__head">
            <th scope="col" className="text-left">
              {firstHeader}
            </th>
            {headers.slice(1).map((header) => (
              <th key={header} scope="col" className="text-right">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="mc-table__row">
              <th scope="row" className="mc-cell-name">
                <PlayerLink
                  playerId={row.id}
                  name={row.name}
                  className="font-semibold text-mtext hover:text-accent"
                />
                {row.out ? <span className="ml-1.5 text-[10px] text-stext">c</span> : null}
              </th>
              {row.cells.map((cell, index) => (
                <td
                  key={`${row.key}-${headers[index + 1]}`}
                  className={`mc-cell-num tabular-nums ${index === 0 ? 'mc-cell-num--lead' : ''}`.trim()}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * The playing XIs.
 *
 * There is no `lineups[]` on these payloads, so the eleven are taken from the players
 * who appear in the scorecard. The heading says so, because a list of eleven names
 * presented as an official team sheet implies a certainty the data does not have: a
 * side bowled out for 40 has ten dismissals and one player who never came to the
 * crease, and an injured substitute would be missing entirely.
 */
export function MatchSquadsTab({
  home,
  away,
  homeName,
  awayName,
  loading,
  isUpcoming,
}: {
  home: SquadEntry[];
  away: SquadEntry[];
  homeName: string;
  awayName: string;
  loading?: boolean;
  isUpcoming?: boolean;
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2" aria-busy="true">
        {[0, 1].map((i) => (
          <MatchSectionCard key={i} icon={Users} title="Squad">
            <Skeleton count={8} height={18} />
          </MatchSectionCard>
        ))}
      </div>
    );
  }

  if (home.length === 0 && away.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="Playing XIs not published yet"
        message={
          isUpcoming
            ? 'The announced teams appear here once the fixture is close to starting.'
            : 'No team sheet or scorecard has been published for this fixture.'
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <SquadCard name={homeName} entries={home} />
        <SquadCard name={awayName} entries={away} />
      </div>
      <p className="text-[11px] text-stext">
        Teams are derived from the published scorecard, so a substitute who never batted or
        bowled is not listed.
      </p>
    </div>
  );
}

function SquadCard({ name, entries }: { name: string; entries: SquadEntry[] }) {
  return (
    <MatchSectionCard
      icon={Users}
      title={name}
      description={entries.length > 0 ? `${entries.length} players` : undefined}
    >
      {entries.length === 0 ? (
        <p className="text-sm text-stext">No players listed for this side.</p>
      ) : (
        <ol className="space-y-1">
          {entries.map((entry, index) => (
            <li key={entry.id || `${entry.name}-${index}`} className="flex items-center gap-2 text-sm">
              <span className="w-5 shrink-0 tabular-nums text-[11px] text-stext">
                {entry.order ?? index + 1}
              </span>
              <PlayerLink
                playerId={entry.id}
                name={entry.name}
                className="min-w-0 flex-1 truncate font-semibold text-mtext hover:text-accent"
              />
              {entry.runs !== null ? (
                <span className="shrink-0 tabular-nums text-xs text-stext">{entry.runs}</span>
              ) : null}
              {entry.wickets !== null ? (
                <span className="shrink-0 tabular-nums text-xs text-stext">{entry.wickets}w</span>
              ) : null}
            </li>
          ))}
        </ol>
      )}
    </MatchSectionCard>
  );
}
