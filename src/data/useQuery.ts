import { useCallback, useEffect, useRef, useState } from 'react';
import { liveState } from './live';

const cache = new Map<string, unknown>();

interface QueryResult<T> {
  data: T | undefined;
  loading: boolean;
  error: Error | null;
  refreshing: boolean;
  refresh: () => void;
}

/**
 * Cached async query. Cached data renders instantly on revisit while a
 * fresh copy loads; `live` re-runs the query silently on every live tick
 * (the future SSE / WebSocket invalidation hook).
 */
export function useQuery<T>(key: string, fetcher: () => Promise<T>, opts: { live?: boolean } = {}): QueryResult<T> {
  const [data, setData] = useState<T | undefined>(() => cache.get(key) as T | undefined);
  const [loading, setLoading] = useState(!cache.has(key));
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchRef = useRef(fetcher);
  fetchRef.current = fetcher;

  const run = useCallback(
    (mode: 'load' | 'refresh' | 'silent') => {
      if (mode === 'refresh') setRefreshing(true);
      let alive = true;
      fetchRef
        .current()
        .then(v => {
          if (!alive) return;
          cache.set(key, v);
          setData(v);
          setError(null);
        })
        .catch(e => alive && setError(e instanceof Error ? e : new Error(String(e))))
        .finally(() => {
          if (!alive) return;
          setLoading(false);
          setRefreshing(false);
        });
      return () => {
        alive = false;
      };
    },
    [key],
  );

  useEffect(() => {
    setData(cache.get(key) as T | undefined);
    setLoading(!cache.has(key));
    return run('load');
  }, [key, run]);

  useEffect(() => {
    if (!opts.live) return;
    return liveState.subscribe(() => run('silent'));
  }, [opts.live, run]);

  return { data, loading, error, refreshing, refresh: () => run('refresh') };
}
