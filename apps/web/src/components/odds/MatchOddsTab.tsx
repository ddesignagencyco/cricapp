'use client';

import Link from 'next/link';
import { Scale } from 'lucide-react';
import MatchOddsView from './MatchOddsView';
import { oddsPageHref } from '../../lib/oddsPaths';
import { matchSides } from '../../lib/predictions';
import type { Match } from '../../types';
import type { MatchOddsResponse } from '../../types/odds';

interface Props {
  match: Match;
  initialOdds?: MatchOddsResponse | null;
  initialOddsForbidden?: boolean;
}

export default function MatchOddsTab({ match, initialOdds = null, initialOddsForbidden = false }: Props) {
  const matchId = String(match.matchId || match.id || '');
  const sides = matchSides(match);
  const pollLive = match.status === 'live';

  return (
    <div className="space-y-4">
      <MatchOddsView
        matchId={matchId}
        homeLabel={sides.homeName}
        awayLabel={sides.awayName}
        initial={initialOdds}
        initialForbidden={initialOddsForbidden}
        pollLive={pollLive}
        compact
      />
      <Link
        href={oddsPageHref(matchId)}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:underline sm:text-sm"
      >
        <Scale size={14} aria-hidden />
        Open full odds page →
      </Link>
    </div>
  );
}
