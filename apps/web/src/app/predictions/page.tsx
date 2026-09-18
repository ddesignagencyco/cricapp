import PredictionsHub from '../../components/predictions/PredictionsHub';
import { featuredRun, mergeChartPoints } from '../../lib/predictions';
import { fetchLiveMatches, fetchMatches } from '../../services/matches';
import { fetchMatchPredictions, fetchPredictionChart, fetchPredictionHistory, fetchPredictionPerformance } from '../../services/predictions';
import type { Match } from '../../types';
import type { MatchPredictions, PredictionChartPoint } from '../../types/predictions';

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

  return Promise.all(
    items.map(async (match, index) => {
      const cardPredictions = predictions[index] as MatchPredictions | null;
      if (!featuredRun(cardPredictions)) {
        return { match, predictions: cardPredictions, chartPoints: [] as PredictionChartPoint[] };
      }
      const matchId = String(match.matchId || match.id);
      const [chart, history] = await Promise.all([
        fetchPredictionChart(matchId).catch(() => null),
        fetchPredictionHistory(matchId).catch(() => null),
      ]);
      return { match, predictions: cardPredictions, chartPoints: mergeChartPoints(chart?.points, history?.runs) };
    })
  );
}

export default async function PredictionsPage() {
  const [performance, liveMatches, upcomingMatches] = await Promise.all([
    fetchPredictionPerformance().catch(() => null),
    fetchLiveMatches().catch(() => []),
    fetchMatches({ status: 'upcoming', limit: 16 }).catch(() => []),
  ]);

  const [live, upcoming] = await Promise.all([
    matchCards(liveMatches),
    matchCards(upcomingMatches),
  ]);

  return <PredictionsHub performance={performance} live={live} upcoming={upcoming} />;
}
