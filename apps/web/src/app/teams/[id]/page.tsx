import { notFound } from 'next/navigation';
import TeamDetailBody from '../../../components/boards/TeamDetailBody';
import { fetchTeamById, fetchTeamRoster, fetchTeams } from '../../../services/teams';
import { fetchMatches } from '../../../services/matches';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await fetchTeamById(id);
  if (!team) {
    return { title: 'Team not found' };
  }
  return {
    title: team.name,
    description: `${team.name} (${team.abbr || ''}) — ${team.country || 'Cricket'} team page.`,
  };
}

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [team, roster, matches, allTeams] = await Promise.all([
    fetchTeamById(id),
    fetchTeamRoster(id),
    fetchMatches(),
    fetchTeams(),
  ]);
  if (!team) {
    return notFound();
  }
  return (
    <TeamDetailBody
      team={team}
      players={roster || []}
      matches={matches || []}
      allTeams={allTeams || []}
    />
  );
}
