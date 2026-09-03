import PlayerDetailBody from '../../../components/boards/PlayerDetailBody.jsx';
import { fetchPlayers, players } from '../../../services/cricketApi.js';

export function generateStaticParams() {
  return players.map((p) => ({ id: p.id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const player = await fetchPlayers({ id });
  if (!player) {
    return { title: 'Player not found' };
  }
  return {
    title: player.name,
    description: `${player.name} — ${player.role} for ${player.teamName}. ${player.runs} runs, ${player.wickets} wickets.`,
  };
}

export default async function PlayerDetailPage({ params }) {
  const { id } = await params;
  const [player, allPlayers] = await Promise.all([
    fetchPlayers({ id }),
    fetchPlayers(),
  ]);
  const teammates = player
    ? allPlayers
        .filter((p) => p.teamId === player.teamId && p.id !== player.id)
        .slice(0, 3)
    : [];
  return <PlayerDetailBody player={player} teammates={teammates} />;
}