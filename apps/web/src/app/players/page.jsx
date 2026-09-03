import PlayerDirectory from '../../components/boards/PlayerDirectory.jsx';
import { fetchPlayers } from '../../services/cricketApi.js';

export const metadata = {
  title: 'Players',
  description:
    'Search and explore the stars of PSL 2026 — batters, bowlers and all-rounders from every franchise.',
};

export default async function PlayersPage() {
  const players = await fetchPlayers();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PlayerDirectory players={players} />
    </div>
  );
}