import { notFound } from 'next/navigation';
import type { Team } from '../../../types/index';
import MatchDetailBody from '../../../components/boards/MatchDetailBody';
import { fetchMatchById, matchSideIds } from '../../../services/matches';
import { fetchTeams } from '../../../services/teams';
import { fetchHeadToHead } from '../../../services/headToHead';
import { sharePageMetadata } from '../../../services/sharing';

export const revalidate = 30;

function looksLikeTeamId(value: string): boolean {
  return value.startsWith('sr:competitor:') || /^[0-9a-f-]{20,}$/i.test(value);
}

function resolveTeamId(raw: string, teams: Team[]): string {
  if (!raw) return '';
  if (raw.startsWith('sr:competitor:')) return raw;
  const needle = raw.toLowerCase();
  const t = teams.find(
    (x) =>
      (x.abbr || '').toLowerCase() === needle ||
      (x.code || '').toLowerCase() === needle ||
      (x.id || '').toLowerCase() === needle ||
      (x.name || '').toLowerCase() === needle
  );
  if (t?.id) return t.id;
  return looksLikeTeamId(raw) ? raw : '';
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await fetchMatchById(id);
  if (!match) {
    return { title: 'Match not found' };
  }
  const names = match.teamNames || [];
  const title = `${names[0] || match.teams?.home?.name || 'Team A'} vs ${names[1] || match.teams?.away?.name || 'Team B'}`;
  return sharePageMetadata({
    title: `${title} — ${match.status || 'Match'}`,
    description: `${match.tournament || 'Cricket'} • ${match.displayScore || 'Live score updates'}`,
    path: `/matches/${id}`,
  });
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await fetchMatchById(id);
  if (!match) {
    return notFound();
  }

  const [teams] = await Promise.all([fetchTeams()]);
  const sides = matchSideIds(match);
  const homeCode = sides.home || match.teams?.home?.code || match.home?.code || '';
  const awayCode = sides.away || match.teams?.away?.code || match.away?.code || '';
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
