import MatchDetailBody from '../../../components/boards/MatchDetailBody.jsx';
import { fetchMatchById, matches } from '../../../services/cricketApi.js';

export function generateStaticParams() {
  return matches.map((m) => ({ id: m.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const match = await fetchMatchById(id);
  if (!match) {
    return { title: 'Match not found' };
  }
  const { home, away } = match.teams;
  const scoreTitle =
    match.status === 'upcoming'
      ? `${home.code} vs ${away.code} — Upcoming`
      : `${home.code} ${home.score || ''} vs ${away.code} ${away.score || ''} — ${match.status === 'live' ? 'Live' : 'Result'}`;
  return {
    title: `${home.code} vs ${away.code} — Match ${match.matchNumber}`,
    description: `${scoreTitle}. ${match.result || ''} ${match.venue}, ${match.date}.`.trim(),
  };
}

export default async function MatchDetailPage({ params }) {
  const { id } = await params;
  const match = await fetchMatchById(id);
  return <MatchDetailBody match={match} />;
}