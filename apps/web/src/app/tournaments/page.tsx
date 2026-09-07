import TournamentsBoard from '../../components/boards/TournamentsBoard';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Tournaments',
  description: 'All cricket competitions — domestic leagues, international tournaments and series.',
};

export default async function TournamentsPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const [{ country }] = await Promise.all([searchParams]);
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <TournamentsBoard initialCountry={country} />
    </div>
  );
}