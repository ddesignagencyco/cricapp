import TeamsDirectory from '../../components/boards/TeamsDirectory';
import { fetchTeams } from '../../services/teams';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Teams',
  description: 'Browse every cricket team – squads, rosters and profiles.',
};

export default async function TeamsPage() {
  const teams = await fetchTeams();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <TeamsDirectory teams={teams || []} />
    </div>
  );
}
