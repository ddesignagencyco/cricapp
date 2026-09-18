import { notFound } from 'next/navigation';
import MatchPredictionsView from '../../../components/predictions/MatchPredictionsView';
import { fetchMatchById } from '../../../services/matches';
import {
  fetchMatchPredictions,
  fetchPredictionChart,
  fetchPredictionHistory,
  fetchPredictionPerformance,
} from '../../../services/predictions';
import { sharePageMetadata } from '../../../services/sharing';

function decodeMatchId(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchId = decodeMatchId(id);
  return sharePageMetadata({
    title: 'Match prediction',
    description: 'Pre-match and live winner probabilities.',
    path: `/predictions/${matchId}`,
  });
}

export default async function MatchPredictionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchId = decodeMatchId(id);
  const match = await fetchMatchById(matchId);
  if (!match) return notFound();

  const [predictions, chart, history, performance] = await Promise.all([
    fetchMatchPredictions(matchId),
    fetchPredictionChart(matchId),
    fetchPredictionHistory(matchId),
    fetchPredictionPerformance().catch(() => null),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <MatchPredictionsView
        match={match}
        initialPredictions={predictions}
        initialChart={chart}
        initialHistory={history}
        initialPerformance={performance}
      />
    </div>
  );
}
