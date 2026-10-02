'use client';

import { Award, Star, Trophy } from 'lucide-react';
import { MatchSectionCard } from './MatchSectionCard';
import { PlayerLink } from '../../EntityLinks';
import PersonAvatar from '../../PersonAvatar';
import type { BatterFigure, BowlerFigure } from '../../../lib/matchPerformers';
import type { SideQualifier } from '../../../lib/matchInnings';

/**
 * The three performance cards.
 *
 * ## Why only two of them usually appear
 *
 * Top batter and top bowler are computed from the real scorecard, so they appear
 * whenever there is one. **Player of the Match is different: the match payload has
 * no such field.** The only structured value nearby is `winnerId`, which is a *team*
 * competitor id — naming a player from it would be a fabrication, and a match centre
 * that invents an award is worse than one that omits it. So the card renders only
 * when the API actually names a player.
 */
export default function KeyPerformers({
  topBatter,
  topBowler,
  playerOfTheMatch,
  sideName,
}: {
  topBatter: BatterFigure | null;
  topBowler: BowlerFigure | null;
  playerOfTheMatch: { name: string; id: string } | null;
  /** Resolves the side a figure played for, from the innings it was scored in. */
  sideName: (_sides: SideQualifier[]) => string;
}) {
  if (!topBatter && !topBowler && !playerOfTheMatch) return null;

  return (
    <MatchSectionCard icon={Star} title="Key Performers">
      {/*
        Two columns, not three.
        Player of the Match only appears when the API names one, which it does not for
        most fixtures, so a three-column grid left a third of the row permanently empty
        next to two cards. Two columns fill the width with what actually exists, and a
        third card — when there is one — wraps to a second row instead of leaving a hole.
      */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {topBatter ? (
          <article className="mc-performer">
            <p className="mc-performer__label">
              <Star size={11} strokeWidth={2.6} aria-hidden="true" className="text-gold" />
              Top Batter
            </p>
            <div className="mt-2 flex items-center gap-2.5">
              <PersonAvatar name={topBatter.name} className="h-11 w-11 shrink-0" />
              <div className="min-w-0">
                <PlayerLink
                  playerId={topBatter.id}
                  name={topBatter.name}
                  className="block truncate text-sm font-bold text-mtext hover:text-accent"
                />
                <p className="truncate text-[11px] text-stext">{sideName(topBatter.sides)}</p>
              </div>
            </div>
            <p className="mt-2">
              <span className="mc-performer__figure tabular-nums">{topBatter.runs}</span>
              <span className="text-xs text-stext"> off {topBatter.balls}</span>
            </p>
            <p className="mt-1.5 text-[11px] text-stext">
              {topBatter.fours} fours · {topBatter.sixes} sixes · SR{' '}
              <span className="tabular-nums">{topBatter.strikeRate.toFixed(2)}</span>
            </p>
          </article>
        ) : null}

        {topBowler ? (
          <article className="mc-performer">
            <p className="mc-performer__label">
              <Trophy size={11} strokeWidth={2.6} aria-hidden="true" className="text-accent" />
              Top Bowler
            </p>
            <div className="mt-2 flex items-center gap-2.5">
              <PersonAvatar name={topBowler.name} className="h-11 w-11 shrink-0" />
              <div className="min-w-0">
                <PlayerLink
                  playerId={topBowler.id}
                  name={topBowler.name}
                  className="block truncate text-sm font-bold text-mtext hover:text-accent"
                />
                <p className="truncate text-[11px] text-stext">{sideName(topBowler.sides)}</p>
              </div>
            </div>
            <p className="mt-2">
              <span className="mc-performer__figure tabular-nums">
                {topBowler.wickets}/{topBowler.runs}
              </span>
              <span className="text-xs text-stext"> in {topBowler.overs} ov</span>
            </p>
            <p className="mt-1.5 text-[11px] text-stext">
              {topBowler.maidens} maidens · Econ{' '}
              <span className="tabular-nums">
                {topBowler.economy === null ? '—' : topBowler.economy.toFixed(2)}
              </span>
            </p>
          </article>
        ) : null}

        {playerOfTheMatch ? (
          <article className="mc-performer mc-performer--pom">
            <p className="mc-performer__label">
              <Award size={11} strokeWidth={2.6} aria-hidden="true" className="text-gold" />
              Player of the Match
            </p>
            <div className="mt-2 flex items-center gap-2.5">
              <PersonAvatar name={playerOfTheMatch.name} className="h-11 w-11 shrink-0" />
              <PlayerLink
                playerId={playerOfTheMatch.id}
                name={playerOfTheMatch.name}
                className="min-w-0 truncate text-sm font-bold text-mtext hover:text-accent"
              />
            </div>
          </article>
        ) : null}
      </div>
    </MatchSectionCard>
  );
}
