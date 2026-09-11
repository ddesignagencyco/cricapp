import { notFound } from 'next/navigation';
import PlayerDetailBody from '../../../components/boards/PlayerDetailBody';
import { fetchPlayerById } from '../../../services/players';
import { sharePageMetadata } from '../../../services/sharing';

export const revalidate = 3600;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await fetchPlayerById(id);
  if (!player) {
    return { title: 'Player not found' };
  }
  return sharePageMetadata({
    title: player.fullName,
    description: `${player.fullName} — ${player.role || 'player'}${player.team?.name ? ` for ${player.team.name}` : ''}.`,
    image: player.profileUrl,
    path: `/players/${id}`,
  });
}

export default async function PlayerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await fetchPlayerById(id);
  if (!player) {
    return notFound();
  }
  return <PlayerDetailBody player={player} />;
}
