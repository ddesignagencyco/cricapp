'use client';

import { useEffect, useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { addFavorite, listFavorites, removeFavorite, type FavoriteItem, type FavoriteTarget } from '../services/favorites';
import { useAuth } from './AuthProvider';

interface FavoriteButtonProps {
  targetType: FavoriteTarget;
  targetId: string;
  compact?: boolean;
}

export default function FavoriteButton({ targetType, targetId, compact = false }: FavoriteButtonProps) {
  const { isAuthenticated } = useAuth();
  const [favorite, setFavorite] = useState<FavoriteItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    setLoading(true);
    listFavorites(targetType)
      .then((items) => setFavorite(items.find((f) => f.targetId === targetId) || null))
      .catch(() => setFavorite(null))
      .finally(() => setLoading(false));
  }, [isAuthenticated, targetType, targetId]);

  const toggle = async () => {
    if (!isAuthenticated) {
      toast.error('Sign in to save favorites.');
      return;
    }
    setBusy(true);
    try {
      if (favorite) {
        await removeFavorite(favorite.id);
        setFavorite(null);
        toast.success('Removed from favorites.');
      } else {
        const added = await addFavorite(targetType, targetId);
        setFavorite(added);
        toast.success('Added to favorites.');
      }
    } catch {
      toast.error('Could not update favorites.');
    } finally {
      setBusy(false);
    }
  };

  if (compact) {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={loading || busy}
        title={favorite ? 'Remove from favorites' : 'Add to favorites'}
        className={`grid h-9 w-9 place-items-center rounded-xl border transition-all disabled:opacity-60 ${
          favorite
            ? 'border-danger/40 bg-danger/10 text-danger shadow-sm'
            : 'border-lborder bg-secondary text-stext hover:border-accent/40 hover:bg-card hover:text-mtext'
        }`}
        aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
        aria-pressed={Boolean(favorite)}
      >
        {loading || busy ? <Loader2 size={16} className="animate-spin" /> : <Heart size={16} fill={favorite ? 'currentColor' : 'none'} />}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading || busy}
      className={`inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-bold transition-colors disabled:opacity-60 ${
        favorite
          ? 'bg-danger/10 text-danger ring-1 ring-danger/30 hover:bg-danger/20'
          : 'bg-accent/10 text-accent ring-1 ring-accent/25 hover:bg-accent/20'
      }`}
      aria-pressed={Boolean(favorite)}
    >
      {loading || busy ? <Loader2 size={15} className="animate-spin" /> : <Heart size={15} fill={favorite ? 'currentColor' : 'none'} />}
      {favorite ? 'Favorited' : 'Add to favorites'}
    </button>
  );
}
