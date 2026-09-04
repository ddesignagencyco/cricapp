import PlayerDirectory from '../../components/boards/PlayerDirectory';
import { fetchPlayers } from '../../services/players';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Players',
  description: 'Search and explore players across every squad.',
};

export default async function PlayersPage() {
  const players = await fetchPlayers();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PlayerDirectory players={players || []} />
    </div>
  );
}
