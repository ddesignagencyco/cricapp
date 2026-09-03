import LiveBoard from '../../components/boards/LiveBoard.jsx';
import { fetchMatches } from '../../services/cricketApi.js';

export const metadata = {
  title: 'Live Scores',
  description:
    'Ball-by-ball updates, live scoreboards and run-rate data for every ongoing cricket fixture.',
};

export default async function LivePage() {
  const matches = await fetchMatches();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <LiveBoard matches={matches} />
    </div>
  );
}