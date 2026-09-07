import TeamsDirectory from '../../components/boards/TeamsDirectory';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Teams',
  description: 'Browse every cricket team – squads, rosters and profiles.',
};

export default async function TeamsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <TeamsDirectory />
    </div>
  );
}
