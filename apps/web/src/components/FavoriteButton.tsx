'use client';

import { Star } from 'lucide-react';
import { useFavoritesStore } from '../stores/favoritesStore';

interface FavoriteButtonProps {
  id: string;
  type?: string;
  size?: number;
}

export default function FavoriteButton({ id, type = 'team', size = 18 }: FavoriteButtonProps) {
  const isTeam = type === 'team';
  const favoriteTeamId = useFavoritesStore((s) => s.favoriteTeamId);
  const setFavoriteTeam = useFavoritesStore((s) => s.setFavoriteTeam);
  const favoritePlayerIds = useFavoritesStore((s) => s.favoritePlayerIds);
  const toggleFavoritePlayer = useFavoritesStore((s) => s.toggleFavoritePlayer);

  const isFav = isTeam ? favoriteTeamId === id : favoritePlayerIds.includes(id);
  const toggle = () => (isTeam ? setFavoriteTeam(id) : toggleFavoritePlayer(id));

  return (
    <button
      type="button"
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(); }}
      className={`rounded-lg p-1.5 transition-colors ${isFav ? 'text-gold hover:text-gold/70' : 'text-stext hover:text-gold'}`}
      aria-label={isFav ? 'Remove favourite' : 'Set as favourite'}
    >
      <Star size={size} fill={isFav ? 'currentColor' : 'none'} />
    </button>
  );
}
