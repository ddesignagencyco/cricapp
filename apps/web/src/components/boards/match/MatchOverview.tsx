'use client';

import { FileText, Quote } from 'lucide-react';
import { MatchSectionCard } from './MatchSectionCard';
import KeyPerformers from './KeyPerformers';
import InningsComparison from './InningsComparison';
import ScorecardHighlights from './ScorecardHighlights';
import FallOfWickets from './FallOfWickets';
import EmptyState from '../../EmptyState';
import { factualMatchSummary } from '../../../lib/matchPerformers';
import type { FallOfWicketEntry } from '../../../lib/matchScorecardData';
import type { BatterFigure, BowlerFigure } from '../../../lib/matchPerformers';
import type { MatchViewModel } from '../../../lib/matchViewModel';
import type { SideQualifier } from '../../../lib/matchInnings';

/**
 * The Overview tab.
 *
 * ## The summary
 *
 * The project has no editorial summary field on a match, so the text is assembled
 * from the result line, the innings scores, the venue and the top performers — all
 * values the API returned. It states facts and stops. It does not narrate a turning
 * point or a momentum swing, because nothing in the payload supports one, and a
 * confident invented sentence is the single worst thing a match centre can show.
 *
 * ## What is omitted rather than faked
 *
 * The fall of wickets section disappears when there are no dismissals. The related
 * story disappears when no article is linked to this match. Neither is replaced with
 * a placeholder or an unrelated article, because a page that fills every slot whether
 * or not it has the data is a page whose filled slots cannot be trusted.
 */
export default function MatchOverview({
  view,
  batters,
  bowlers,
  topBatter,
  topBowler,
  playerOfTheMatch,
  fallOfWickets,
  onViewScorecard,
  scorecardHref,
}: {
  view: MatchViewModel;
  batters: BatterFigure[];
  bowlers: BowlerFigure[];
  topBatter: BatterFigure | null;
  topBowler: BowlerFigure | null;
  playerOfTheMatch: { name: string; id: string } | null;
  /** Keyed by innings number. */
  fallOfWickets: Map<number, FallOfWicketEntry[]>;
  /** A story genuinely linked to this match, or null. */
  onViewScorecard?: () => void;
  scorecardHref?: string | null;
}) {
  const summary = factualMatchSummary({
    innings: view.innings,
    winnerName: view.winnerName,
    result: view.result ?? '',
    status: view.status,
    venue: view.venue ?? (view.venueCity ? `${view.venue}, ${view.venueCity}` : ''),
    topBatterName: topBatter?.name ?? '',
    topBatterRuns: topBatter?.runs ?? null,
    topBowlerName: topBowler?.name ?? '',
    topBowlerWickets: topBowler?.wickets ?? null,
  });

  /** "Both sides" when a player figure spans both, otherwise the one team. */
  const figureSide = (sides: SideQualifier[]) => {
    if (sides.length === 0) return '';
    if (sides.length > 1) return 'Both sides';
    return sides[0] === 'home' ? view.home.name : view.away.name;
  };

  /** The team that batted one innings. */
  const inningsSide = (side: SideQualifier | null) =>
    side === 'home' ? view.home.name : side === 'away' ? view.away.name : '';

  const hasScorecard = batters.length > 0 || bowlers.length > 0;
  const hasAnything = hasScorecard || view.innings.length > 0;

  if (!hasAnything) {
    return (
      <EmptyState
        icon={FileText}
        title="Nothing to summarise yet"
        message={
          view.isUpcoming
            ? 'The scorecard, commentary and playing XIs appear once this fixture starts.'
            : 'No scorecard or commentary has been published for this fixture yet.'
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <MatchSectionCard icon={Quote} title="Match Summary">
        <p className="text-sm leading-relaxed text-mtext">{summary}</p>
      </MatchSectionCard>

      <KeyPerformers
        topBatter={topBatter}
        topBowler={topBowler}
        playerOfTheMatch={playerOfTheMatch}
        sideName={figureSide}
      />

      <InningsComparison view={view} />

      <ScorecardHighlights
        batters={batters}
        bowlers={bowlers}
        onViewScorecard={onViewScorecard}
        viewAllHref={scorecardHref}
      />

      <FallOfWickets entries={fallOfWickets} innings={view.innings} sideName={inningsSide} />
    </div>
  );
}
