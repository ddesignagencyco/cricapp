import PlayerDirectory from '../../components/boards/PlayerDirectory';
import { fetchPlayersPage } from '../../services/players';

export const revalidate = 3600;

export const metadata = {
  title: 'Players',
  description: 'Search and explore players across every squad.',
};

export default async function PlayersPage() {
  const { items, total } = await fetchPlayersPage({ limit: 24, page: 1 }).catch(() => ({
    items: [],
    total: 0,
    totalPages: 1,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PlayerDirectory initialPlayers={items} initialTotal={total} />
    </div>
  );
}
