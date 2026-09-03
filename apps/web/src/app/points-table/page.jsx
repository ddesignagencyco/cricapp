import PointsTableBoard from '../../components/boards/PointsTableBoard.jsx';
import { fetchPSLTeams, fetchMatches } from '../../services/cricketApi.js';

export const metadata = {
  title: 'Points Table',
  description:
    'Championship standings, net run rates and playoff qualification status. PSL 2026 points table.',
};

export default async function PointsTablePage() {
  const [teams, matches] = await Promise.all([fetchPSLTeams(), fetchMatches()]);
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PointsTableBoard teams={teams} matches={matches} />
    </div>
  );
}