import { notFound } from 'next/navigation';
import type { Team } from '../../../types/index';
import MatchDetailBody from '../../../components/boards/MatchDetailBody';
import { fetchMatchById } from '../../../services/matches';
import { fetchTeams } from '../../../services/teams';
import { fetchHeadToHead } from '../../../services/headToHead';

export const revalidate = 30;

function resolveTeamId(raw: string, teams: Team[]): string {
  if (!raw) return '';
  if (raw.startsWith('sr:competitor:')) return raw;
  const t = teams.find(
    (x) =>
      (x.abbr || '').toLowerCase() === raw.toLowerCase() ||
      (x.id || '').toLowerCase() === raw.toLowerCase()
  );
  return t?.id || '';
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await fetchMatchById(id);
  if (!match) {
    return { title: 'Match not found' };
  }
  const names = match.teamNames || [];
  const title = `${names[0] || match.teams?.home?.name || 'Team A'} vs ${names[1] || match.teams?.away?.name || 'Team B'}`;
  return {
    title: `${title} — ${match.status || 'Match'}`,
    description: `${match.tournament || 'Cricket'} • ${match.displayScore || 'Full score details'}`,
  };
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await fetchMatchById(id);
  if (!match) {
    return notFound();
  }

  const [teams] = await Promise.all([fetchTeams()]);
  const homeCode = match.teams?.home?.code || match.home?.code || '';
  const awayCode = match.teams?.away?.code || match.away?.code || '';
  const teamAId = resolveTeamId(homeCode, teams || []);
  const teamBId = resolveTeamId(awayCode, teams || []);

  let headToHead = null;
  if (teamAId && teamBId) {
    try {
      headToHead = await fetchHeadToHead(teamAId, teamBId);
    } catch {
      headToHead = null;
    }
  }

  return <MatchDetailBody match={match} headToHead={headToHead} />;
}
