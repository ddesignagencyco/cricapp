import LiveBoard from '../../components/boards/LiveBoard';
import { fetchMatches } from '../../services/matches';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Live Scores',
  description: 'Live scoreboards and run-rate data for every ongoing cricket fixture.',
};

export default async function LivePage() {
  const matches = await fetchMatches();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <LiveBoard matches={matches || []} />
    </div>
  );
}
