import TeamCard from '../../components/TeamCard.jsx';
import { fetchPSLTeams } from '../../services/cricketApi.js';
import { Users } from 'lucide-react';

export const metadata = {
  title: 'Teams',
  description: 'The six franchises competing for the PSL 2026 title.',
};

export default async function TeamsPage() {
  const teams = await fetchPSLTeams();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-accent">
          <Users size={18} />
          <span className="text-xs font-bold uppercase tracking-widest text-stext">
            PSL Franchises
          </span>
        </div>
        <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Teams</h1>
        <p className="mt-2 text-sm text-stext">
          The six franchises competing for the PSL 2026 title.
        </p>
      </header>

      <div className="fade-in grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {teams.map((t) => (
          <TeamCard key={t.id} team={t} />
        ))}
      </div>
    </div>
  );
}