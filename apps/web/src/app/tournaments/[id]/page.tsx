import { notFound } from 'next/navigation';
import {
  fetchTournamentById,
  fetchTournamentSeasons,
  fetchTournamentResults,
} from '../../../services/tournaments';
import TournamentDetailPageClient from './TournamentDetailPageClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await fetchTournamentById(id);
  return {
    title: tournament?.name || 'Tournament',
    description: `${tournament?.name || 'Tournament'} — results, seasons and details.`,
  };
}

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [tournament, seasons, results] = await Promise.all([
    fetchTournamentById(id),
    fetchTournamentSeasons(id),
    fetchTournamentResults(id),
  ]);

  if (!tournament) {
    return notFound();
  }

  return (
    <TournamentDetailPageClient 
      tournament={tournament} 
      seasons={seasons || []} 
      results={results || []} 
    />
  );
}
