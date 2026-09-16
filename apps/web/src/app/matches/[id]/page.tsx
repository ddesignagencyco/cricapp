import { notFound } from 'next/navigation';
import MatchDetailBody from '../../../components/boards/MatchDetailBody';
import { fetchMatchById } from '../../../services/matches';
import { sharePageMetadata } from '../../../services/sharing';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let matchId = id;
  try {
    matchId = decodeURIComponent(id);
  } catch {
    matchId = id;
  }
  return sharePageMetadata({
    title: 'Match',
    description: 'Live cricket score, scoreboard and timeline.',
    path: `/matches/${matchId}`,
  });
}

export default async function MatchDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let matchId = id;
  try {
    matchId = decodeURIComponent(id);
  } catch {
    matchId = id;
  }
  const match = await fetchMatchById(matchId);
  if (!match) {
    return notFound();
  }

  return <MatchDetailBody match={match} />;
}
