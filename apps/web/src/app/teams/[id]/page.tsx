import { notFound } from 'next/navigation';
import TeamDetailBody from '../../../components/boards/TeamDetailBody';
import {
  fetchTeamById,
  fetchTeamRosterPage,
  fetchTeamSchedule,
  fetchTeamResults,
  fetchTeams,
} from '../../../services/teams';
import { sharePageMetadata } from '../../../services/sharing';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const team = await fetchTeamById(id);
  if (!team) {
    return { title: 'Team not found' };
  }
  return sharePageMetadata({
    title: team.name,
    description: `${team.name} (${team.abbr || ''}) — ${team.country || 'Cricket'} team page.`,
    image: team.logoUrl,
    path: `/teams/${id}`,
  });
}

export default async function TeamDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [team, roster, schedule, results, allTeams] = await Promise.all([
    fetchTeamById(id),
    fetchTeamRosterPage(id, { page: 1, limit: 40 }),
    fetchTeamSchedule(id, { page: 1, limit: 50 }),
    fetchTeamResults(id, { page: 1, limit: 50 }),
    fetchTeams(),
  ]);
  if (!team) {
    return notFound();
  }
  return (
    <TeamDetailBody
      team={team}
      players={roster.items || []}
      playerTotal={roster.total}
      schedule={schedule || []}
      results={results || []}
      allTeams={allTeams || []}
    />
  );
}
