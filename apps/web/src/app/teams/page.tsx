import TeamCard from '../../components/TeamCard';
import { fetchTeams } from '../../services/teams';
import { Users } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Teams',
  description: 'Browse every cricket team — squads, rosters and profiles.',
};

export default async function TeamsPage() {
  const teams = await fetchTeams();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-accent">
          <Users size={18} />
          <span className="text-xs font-bold uppercase tracking-widest text-stext">
            All Teams
          </span>
        </div>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Teams</h1>
        <p className="mt-2 text-sm text-stext">
          Browse every cricket team and their squads.
        </p>
      </header>

      <div className="fade-in grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(teams || []).map((t) => (
          <TeamCard key={t.id} team={t} />
        ))}
      </div>
    </div>
  );
}
