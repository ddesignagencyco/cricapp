import FavoritesBody from '../../components/boards/FavoritesBody';

export const metadata = {
  title: 'Favorites',
  description: 'Your followed teams, players and fixtures — all in one place on PAK CRICZONE.',
};

export default function FavoritesPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <FavoritesBody />
    </div>
  );
}
