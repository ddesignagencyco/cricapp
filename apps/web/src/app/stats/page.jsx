import StatsBoard from '../../components/boards/StatsBoard.jsx';
import { fetchPlayers } from '../../services/cricketApi.js';

export const metadata = {
  title: 'Statistics',
  description:
    'PSL 2026 season leaders — most runs, wickets, sixes, strike rates and best figures across every franchise.',
};

export default async function StatsPage() {
  const players = await fetchPlayers();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <StatsBoard players={players} />
    </div>
  );
}