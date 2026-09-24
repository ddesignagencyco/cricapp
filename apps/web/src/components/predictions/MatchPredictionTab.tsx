'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrendingUp } from 'lucide-react';
import EmptyState from '../EmptyState';
import { Skeleton } from '../skeletons/Skeletons';
import WinProbabilityBar from './WinProbabilityBar';
import { featuredRun, matchSides, stageLabel } from '../../lib/predictions';
import { fetchMatchPredictions } from '../../services/predictions';
import type { Match } from '../../types';
import type { MatchPredictions } from '../../types/predictions';
import Badge from '../Badge';

interface Props {
  match: Match;
}

export default function MatchPredictionTab({ match }: Props) {
  const matchId = String(match.matchId || match.id || '');
  const [predictions, setPredictions] = useState<MatchPredictions | null>(null);
  const [loading, setLoading] = useState(true);
  const sides = matchSides(match);

  useEffect(() => {
    if (!matchId) return;
    let cancelled = false;
    setLoading(true);
    void fetchMatchPredictions(matchId)
      .then((next) => {
        if (!cancelled) setPredictions(next);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [matchId]);

  if (loading) {
    return (
      <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder sm:p-6" aria-busy="true">
        <Skeleton height={22} width={180} />
        <div className="mt-5">
          <Skeleton height={56} />
        </div>
      </div>
    );
  }

  const run = featuredRun(predictions);
  if (!run) {
    return (
      <EmptyState
        title="No predictions yet"
        message="The model has not stored a pre-match or live run for this fixture."
        icon={TrendingUp}
      />
    );
  }

  return (
    <div className="rounded-2xl bg-card p-5 ring-1 ring-lborder sm:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold tracking-tight text-mtext">Win probability</h3>
        <Badge tone={run.stage === 'live' ? 'live' : 'primary'}>{stageLabel(run.stage)}</Badge>
      </div>
      <WinProbabilityBar
        homeLabel={sides.homeName}
        awayLabel={sides.awayName}
        homeWinProb={run.homeWinProb}
        awayWinProb={run.awayWinProb}
      />
      <Link
        href={`/predictions/${matchId}`}
        className="mt-5 inline-flex items-center text-xs font-semibold text-accent hover:underline sm:text-sm"
      >
        View full prediction →
      </Link>
    </div>
  );
}
