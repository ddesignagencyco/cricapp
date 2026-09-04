import MatchBoard from '../../components/boards/MatchBoard';
import { fetchMatches } from '../../services/matches';

export const metadata = {
  title: 'Matches',
  description:
    'Browse live, upcoming and completed fixtures across PSL 2026 and international cricket.',
};

export const dynamic = 'force-dynamic';

export default async function MatchesPage() {
  const matches = await fetchMatches();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <MatchBoard matches={matches} />
    </div>
  );
}
