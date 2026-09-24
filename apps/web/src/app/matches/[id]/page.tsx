import { notFound } from 'next/navigation';
import MatchDetailBody from '../../../components/boards/MatchDetailBody';
import { fetchMatchById } from '../../../services/matches';
import { fetchMatchOdds } from '../../../services/odds';
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
  const [match, oddsResult] = await Promise.all([
    fetchMatchById(matchId),
    fetchMatchOdds(matchId).catch(() => null),
  ]);
  if (!match) {
    return notFound();
  }

  const initialOdds = oddsResult?.status === 'ok' ? oddsResult.data : null;
  const initialOddsForbidden = oddsResult?.status === 'forbidden';

  return (
    <MatchDetailBody
      match={match}
      initialOdds={initialOdds}
      initialOddsForbidden={initialOddsForbidden}
    />
  );
}
