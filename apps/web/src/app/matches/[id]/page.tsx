import { notFound } from 'next/navigation';
import MatchDetailBody from '../../../components/boards/MatchDetailBody';
import { fetchMatchById } from '../../../services/matches';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await fetchMatchById(id);
  if (!match) {
    return { title: 'Match not found' };
  }
  const names = match.teamNames || [];
  const title = `${names[0] || match.teams?.[0] || 'Team A'} vs ${names[1] || match.teams?.[1] || 'Team B'}`;
  return {
    title: `${title} — ${match.matchStatus || match.status || 'Match'}`,
    description: `${match.tournament || 'Cricket'} • ${match.displayScore || 'Full score details'}`,
  };
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const match = await fetchMatchById(id);
  if (!match) {
    return notFound();
  }
  return <MatchDetailBody match={match} />;
}
