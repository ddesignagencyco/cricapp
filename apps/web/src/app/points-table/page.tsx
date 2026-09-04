import PointsTableBoard from '../../components/boards/PointsTableBoard';
import { fetchPslStandings } from '../../services/psl';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Points Table',
  description: 'League standings, net run rates and playoff positions.',
};

export default async function PointsTablePage() {
  const standings = await fetchPslStandings();
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <PointsTableBoard standings={standings || []} />
    </div>
  );
}
