import PredictionsHub from '../../components/predictions/PredictionsHub';
import { fetchLiveMatches, fetchMatches } from '../../services/matches';
import { fetchMatchPredictions } from '../../services/predictions';
import type { Match } from '../../types';
import type { MatchPredictions } from '../../types/predictions';

export const revalidate = 30;

export const metadata = {
  title: 'Predictions',
  description: 'Pre-match and live statistical winner probabilities for cricket matches.',
};

async function matchCards(matches: Match[]) {
  const unique = new Map<string, Match>();
  for (const match of matches) {
    const id = String(match.matchId || match.id || '');
    if (id) unique.set(id, match);
  }

  const items = [...unique.values()].slice(0, 16);
  const predictions = await Promise.all(
    items.map((match) => fetchMatchPredictions(String(match.matchId || match.id)).catch(() => null))
  );

  return items.map((match, index) => ({
    match,
    predictions: predictions[index] as MatchPredictions | null,
  }));
}

export default async function PredictionsPage() {
  const [liveMatches, upcomingMatches] = await Promise.all([
    fetchLiveMatches().catch(() => []),
    fetchMatches({ status: 'upcoming', limit: 16 }).catch(() => []),
  ]);

  const [live, upcoming] = await Promise.all([
    matchCards(liveMatches),
    matchCards(upcomingMatches),
  ]);

  return <PredictionsHub performance={null} live={live} upcoming={upcoming} />;
}
