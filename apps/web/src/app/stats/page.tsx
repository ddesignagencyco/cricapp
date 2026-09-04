import StatsBoard from '../../components/boards/StatsBoard';
import { fetchPslLeaders } from '../../services/psl';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Statistics',
  description: 'PSL season leaders — most runs, wickets, strike rates and more.',
};

export default async function StatsPage() {
  const leaders = await fetchPslLeaders();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <StatsBoard leaders={leaders || []} />
    </div>
  );
}
