import { Suspense } from 'react';
import SearchResultsBody from '../../components/boards/SearchResultsBody.jsx';

export const metadata = {
  title: 'Search',
  description: 'Search players, teams, matches and tournaments on PAK CRICZONE.',
};

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Suspense fallback={null}>
        <SearchResultsBody />
      </Suspense>
    </div>
  );
}
