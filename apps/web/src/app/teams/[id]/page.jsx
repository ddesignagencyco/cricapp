import TeamDetailBody from '../../../components/boards/TeamDetailBody.jsx';
import { fetchTeamById, fetchPlayers, fetchMatches, teams } from '../../../services/cricketApi.js';

export function generateStaticParams() {
  return teams.map((t) => ({ id: t.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const team = await fetchTeamById(id);
  if (!team) {
    return { title: 'Team not found' };
  }
  return {
    title: team.name,
    description: `${team.description?.slice(0, 150) || `${team.name} — PSL 2026 franchise page.`}`,
  };
}

export default async function TeamDetailPage({ params }) {
  const { id } = await params;
  const [team, players, matches] = await Promise.all([
    fetchTeamById(id),
    fetchPlayers({ teamId: id }),
    fetchMatches({ teamId: id }),
  ]);
  return <TeamDetailBody team={team} players={players} matches={matches} />;
}