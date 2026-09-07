import ToursBoard from '../../components/boards/ToursBoard';
import { fetchTours } from '../../services/tours';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Tours',
  description: 'Browse international and domestic cricket tours by country and category.',
};

export default async function ToursPage() {
  const tours = await fetchTours();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <ToursBoard tours={tours || []} />
    </div>
  );
}
