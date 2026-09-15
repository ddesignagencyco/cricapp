import { notFound } from 'next/navigation';
import PlayerDetailBody from '../../../components/boards/PlayerDetailBody';
import { fetchNews } from '../../../services/news';
import { fetchPlayerById } from '../../../services/players';
import { sharePageMetadata } from '../../../services/sharing';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return sharePageMetadata({
    title: 'Player',
    description: 'Player profile, role and recent matches.',
    path: `/players/${id}`,
  });
}

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [player, relatedNews] = await Promise.all([
    fetchPlayerById(id),
    fetchNews({ playerId: id, limit: 6 }).catch(() => []),
  ]);
  if (!player) {
    return notFound();
  }
  return <PlayerDetailBody player={player} relatedNews={relatedNews} />;
}
