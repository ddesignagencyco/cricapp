import { Suspense } from 'react';
import ToursBoard from '../../components/boards/ToursBoard';
import { ToursPageSkeleton } from '../../components/skeletons/Skeletons';

export const revalidate = 3600;

export const metadata = {
  title: 'Tours',
  description: 'Browse international and domestic cricket tours by country and category.',
};

export default function ToursPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Suspense fallback={<ToursPageSkeleton />}>
        <ToursBoard />
      </Suspense>
    </div>
  );
}
