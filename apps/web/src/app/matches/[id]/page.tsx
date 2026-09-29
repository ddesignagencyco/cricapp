import { notFound } from 'next/navigation';
import MatchDetailBody from '../../../components/boards/MatchDetailBody';
import { fetchMatchById, fetchMatchTimeline } from '../../../services/matches';
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
  // The timeline carries the tournament type, which is the only reliable signal
  // for first-class vs limited-overs. Fetching it here rather than per-tab means
  // the result line ("Match drawn" vs "No result") is right on first paint and
  // does not change when a tab loads.
  const [match, oddsResult, timeline] = await Promise.all([
    fetchMatchById(matchId),
    fetchMatchOdds(matchId).catch(() => null),
    fetchMatchTimeline(matchId).catch(() => null),
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
      initialTimeline={timeline?.payload ?? null}
    />
  );
}
