import ToursBoard from '../../components/boards/ToursBoard';
import AdSlot from '../../components/AdSlot';
import { fetchTours } from '../../services/tours';

export const revalidate = 3600;

export const metadata = {
  title: 'Tours',
  description: 'Browse international and domestic cricket tours by country and category.',
};

export default async function ToursPage() {
  const tours = await fetchTours();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <AdSlot slot="tours-top" format="leaderboard" className="mb-6" />
      <ToursBoard tours={tours || []} />
      <AdSlot slot="tours-bottom" format="leaderboard" className="mt-8" />
    </div>
  );
}
