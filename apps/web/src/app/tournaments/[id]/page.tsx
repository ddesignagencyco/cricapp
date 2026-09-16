import { notFound } from 'next/navigation';
import {
  fetchTournamentById,
  fetchTournamentSeasons,
  fetchTournamentResults,
} from '../../../services/tournaments';
import TournamentDetailPageClient from './TournamentDetailPageClient';
import type { TournamentSeason } from '../../../types/index';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await fetchTournamentById(id);
  return {
    title: tournament?.name || 'Tournament',
    description: `${tournament?.name || 'Tournament'} — results, seasons and details.`,
  };
}

function seasonFromCurrent(tournament: { currentSeason?: TournamentSeason | Record<string, unknown> | null }): TournamentSeason | null {
  const current = tournament.currentSeason;
  if (!current || typeof current !== 'object') return null;
  const row = current as Record<string, unknown>;
  const id = String(row.id || '');
  if (!id) return null;
  return {
    id,
    tournamentId: String(row.tournamentId || row.tournament_id || ''),
    name: typeof row.name === 'string' ? row.name : undefined,
    year: typeof row.year === 'string' ? row.year : undefined,
    startDate: String(row.startDate || row.start_date || '') || undefined,
    endDate: String(row.endDate || row.end_date || '') || undefined,
  };
}

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [tournament, listedSeasons] = await Promise.all([
    fetchTournamentById(id),
    fetchTournamentSeasons(id),
  ]);

  if (!tournament) {
    return notFound();
  }

  const seasons = [...(listedSeasons || [])];
  const current = seasonFromCurrent(tournament);
  if (current && !seasons.some((season) => season.id === current.id)) {
    seasons.unshift(current);
  }

  const resultsBySeason = Object.fromEntries(
    await Promise.all(
      seasons.map(async (season) => [season.id, await fetchTournamentResults(season.id)] as const),
    ),
  );

  const initialSeasonId =
    (current && seasons.some((season) => season.id === current.id) ? current.id : seasons[0]?.id) || '';

  return (
    <TournamentDetailPageClient
      tournament={tournament}
      seasons={seasons}
      resultsBySeason={resultsBySeason}
      initialSeasonId={initialSeasonId}
    />
  );
}
