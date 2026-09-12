import StatsBoard from '../../components/boards/StatsBoard';
import { fetchPslLeaders } from '../../services/psl';

export const revalidate = 300;

export async function generateMetadata({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const params = await searchParams;
  const season = params.season || '';
  return {
    title: season ? `Statistics ${season}` : 'Statistics',
    description: 'Cricket statistics — most runs, wickets, strike rates and more.',
  };
}

export default async function StatsPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const params = await searchParams;
  const selectedSeason = params.season || '';
  const leaders = await fetchPslLeaders(selectedSeason ? { season: selectedSeason } : {});
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <StatsBoard leaders={leaders || []} season={selectedSeason} />
    </div>
  );
}
