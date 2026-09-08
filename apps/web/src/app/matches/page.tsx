import MatchBoard from '../../components/boards/MatchBoard';

export const metadata = {
  title: 'Matches',
  description:
    'Browse live, upcoming, and completed matches across domestic and international cricket.',
};

export const dynamic = 'force-dynamic';

export default function MatchesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <MatchBoard />
    </div>
  );
}
