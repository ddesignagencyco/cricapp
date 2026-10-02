import PlayerDirectory from '../../components/boards/PlayerDirectory';

export const revalidate = 3600;

export const metadata = {
  title: 'Players',
  description: 'Search and explore players across every squad.',
};

export default function PlayersPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PlayerDirectory />
    </div>
  );
}
