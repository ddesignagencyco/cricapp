import PredictionsHub from '../../components/predictions/PredictionsHub';
import { fetchLiveMatches, fetchMatchesPage } from '../../services/matches';
import { fetchPredictionPerformance, fetchPredictionsByMatchIds } from '../../services/predictions';
import type { Match } from '../../types';
import type { MatchPredictions, PredictionPerformance } from '../../types/predictions';

export const revalidate = 30;

export const metadata = {
  title: 'Predictions',
  description: 'Pre-match and live statistical winner probabilities for cricket matches.',
};

const UPCOMING_LIMIT = 12;

async function matchCards(matches: Match[]) {
  const unique = new Map<string, Match>();
  for (const match of matches) {
    const id = String(match.matchId || match.id || '');
    if (id) unique.set(id, match);
  }

  const items = [...unique.values()];
  const ids = items.map((match) => String(match.matchId || match.id));
  const predictions = await fetchPredictionsByMatchIds(ids);

  return items.map((match) => ({
    match,
    predictions: (predictions.get(String(match.matchId || match.id)) ?? null) as MatchPredictions | null,
  }));
}

export default async function PredictionsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; tab?: string }>;
}) {
  const { page: pageRaw, tab: tabRaw } = await searchParams;
  const upcomingPage = Math.max(1, Number(pageRaw) || 1);
  const tabFromUrl = tabRaw === 'live' || tabRaw === 'upcoming' ? tabRaw : null;

  const [liveMatches, upcomingResult, performance] = await Promise.all([
    fetchLiveMatches().catch(() => []),
    fetchMatchesPage({ status: 'upcoming', limit: UPCOMING_LIMIT, page: upcomingPage }).catch(() => ({
      items: [] as Match[],
      total: 0,
      totalPages: 0,
    })),
    fetchPredictionPerformance().catch(() => null as PredictionPerformance | null),
  ]);

  const tab = tabFromUrl
    ?? (liveMatches.length > 0 ? 'live' : upcomingResult.total > 0 ? 'upcoming' : 'live');

  const [live, upcoming] = await Promise.all([
    tab === 'live' ? matchCards(liveMatches) : Promise.resolve(liveMatches.map((match) => ({ match, predictions: null }))),
    tab === 'upcoming' ? matchCards(upcomingResult.items) : Promise.resolve(upcomingResult.items.map((match) => ({ match, predictions: null }))),
  ]);

  return (
    <PredictionsHub
      performance={performance}
      live={live}
      upcoming={upcoming}
      upcomingPage={upcomingPage}
      upcomingTotal={upcomingResult.total}
      upcomingLimit={UPCOMING_LIMIT}
      initialTab={tab}
    />
  );
}
