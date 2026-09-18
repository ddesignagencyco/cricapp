import { notFound } from 'next/navigation';
import MatchPredictionsView from '../../../components/predictions/MatchPredictionsView';
import { fetchMatchById } from '../../../services/matches';
import {
  fetchMatchPredictions,
  fetchPredictionChart,
  fetchPredictionHistory,
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
  const [match, predictions, chart, history] = await Promise.all([
    fetchMatchById(matchId),
    fetchMatchPredictions(matchId).catch(() => null),
    fetchPredictionChart(matchId).catch(() => null),
    fetchPredictionHistory(matchId).catch(() => null),
  ]);
  if (!match) return notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <MatchPredictionsView
        match={match}
        initialPredictions={predictions}
        initialChart={chart}
        initialHistory={history}
      />
    </div>
  );
}
