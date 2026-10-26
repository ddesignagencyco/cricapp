import { useCallback, useEffect, useRef, useState } from 'react';

export interface Page<T> {
  items: T[];
  hasMore: boolean;
}

interface PagedResult<T> {
  items: T[];
  /** First page still loading. */
  loading: boolean;
  loadingMore: boolean;
  refreshing: boolean;
  hasMore: boolean;
  error: Error | null;
  loadMore: () => void;
  refresh: () => void;
}

const cache = new Map<string, { items: unknown[]; page: number; hasMore: boolean }>();

/**
 * Page-at-a-time loading for long lists (news, fixtures, results): the
 * first page renders as soon as it arrives and `loadMore` fetches the next
 * one when the user scrolls near the end, so the app never pulls a whole
 * table at once. Loaded pages are cached per key for instant revisits.
 */
export function usePaged<T>(key: string, fetchPage: (page: number) => Promise<Page<T>>): PagedResult<T> {
  const cached = cache.get(key);
  const [items, setItems] = useState<T[]>((cached?.items as T[]) ?? []);
  const [page, setPage] = useState(cached?.page ?? 0);
  const [hasMore, setHasMore] = useState(cached?.hasMore ?? true);
  const [loading, setLoading] = useState(!cached);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;
  // Ignore responses for a key the screen has moved away from.
  const keyRef = useRef(key);
  keyRef.current = key;
  const busy = useRef(false);

  const load = useCallback(
    async (next: number, mode: 'first' | 'more' | 'refresh') => {
      if (busy.current && mode === 'more') return;
      busy.current = true;
      const forKey = key;
      if (mode === 'more') setLoadingMore(true);
      if (mode === 'refresh') setRefreshing(true);
      try {
        const res = await fetchRef.current(next);
        if (keyRef.current !== forKey) return;
        setItems(prev => {
          const merged = next === 1 ? res.items : [...prev, ...res.items];
          cache.set(forKey, { items: merged, page: next, hasMore: res.hasMore });
          return merged;
        });
        setPage(next);
        setHasMore(res.hasMore);
        setError(null);
      } catch (e) {
        if (keyRef.current === forKey) setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        busy.current = false;
        if (keyRef.current === forKey) {
          setLoading(false);
          setLoadingMore(false);
          setRefreshing(false);
        }
      }
    },
    [key],
  );

  useEffect(() => {
    const c = cache.get(key);
    setItems((c?.items as T[]) ?? []);
    setPage(c?.page ?? 0);
    setHasMore(c?.hasMore ?? true);
    setLoading(!c);
    setError(null);
    // Revisit: show the cache and quietly refresh the first page.
    load(1, 'first');
  }, [key, load]);

  return {
    items,
    loading,
    loadingMore,
    refreshing,
    hasMore,
    error,
    loadMore: () => {
      if (hasMore && !loading && !loadingMore && page > 0) load(page + 1, 'more');
    },
    refresh: () => load(1, 'refresh'),
  };
}
