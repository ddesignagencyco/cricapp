'use client';

import { useEffect, useState } from 'react';
import { Heart, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  addFavorite,
  loadFavoritesForHearts,
  peekFavoriteCache,
  rememberFavoriteAdded,
  rememberFavoriteRemoved,
  removeFavorite,
  subscribeFavoriteCache,
  type FavoriteItem,
  type FavoriteTarget,
} from '../services/favorites';
import { useAuth } from './AuthProvider';

interface FavoriteButtonProps {
  targetType: FavoriteTarget;
  targetId: string;
  compact?: boolean;
  className?: string;
}

export default function FavoriteButton({ targetType, targetId, compact = false, className = '' }: FavoriteButtonProps) {
  const { isAuthenticated } = useAuth();
  const [favorite, setFavorite] = useState<FavoriteItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      setFavorite(null);
      setLoading(false);
      return;
    }

    const apply = (items: FavoriteItem[]) => {
      setFavorite(items.find((item) => item.targetId === targetId) || null);
    };

    const cached = peekFavoriteCache(targetType);
    if (cached) {
      apply(cached);
      setLoading(false);
    } else {
      setLoading(true);
    }

    let cancelled = false;
    loadFavoritesForHearts(targetType)
      .then((items) => {
        if (!cancelled) apply(items);
      })
      .catch(() => {
        if (!cancelled) setFavorite(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    const unsubscribe = subscribeFavoriteCache(() => {
      const next = peekFavoriteCache(targetType);
      if (next) apply(next);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
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
        rememberFavoriteRemoved(targetType, favorite.id);
        setFavorite(null);
        toast.success('Removed from favorites.');
      } else {
        const added = await addFavorite(targetType, targetId);
        rememberFavoriteAdded(added);
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
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void toggle();
        }}
        disabled={loading || busy}
        title={favorite ? 'Remove from favorites' : 'Add to favorites'}
        className={`icon-btn h-9 w-9 disabled:opacity-60 ${
          favorite
            ? 'icon-btn-bordered border-danger/40 bg-danger/10 text-danger'
            : 'icon-btn-bordered'
        } ${className}`}
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
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        void toggle();
      }}
      disabled={loading || busy}
      className={`inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-bold transition-colors disabled:opacity-60 ${
        favorite
          ? 'bg-danger/10 text-danger ring-1 ring-danger/30 hover:bg-danger/20'
          : 'bg-accent/10 text-accent ring-1 ring-accent/25 hover:bg-accent/20'
      } ${className}`}
      aria-pressed={Boolean(favorite)}
    >
      {loading || busy ? <Loader2 size={15} className="animate-spin" /> : <Heart size={15} fill={favorite ? 'currentColor' : 'none'} />}
      {favorite ? 'Favorited' : 'Add to favorites'}
    </button>
  );
}
