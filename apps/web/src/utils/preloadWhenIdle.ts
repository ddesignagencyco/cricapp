/**
 * Fetch a lazily loaded chunk once the browser is idle, so the first tap on a
 * search or assistant button opens instantly instead of waiting on the network.
 * Returns a cleanup for `useEffect`.
 */
export function preloadWhenIdle(load: () => Promise<unknown>, timeoutMs = 4000): () => void {
  const run = () => {
    void load().catch(() => undefined);
  };
  if (typeof window.requestIdleCallback === 'function') {
    const id = window.requestIdleCallback(run, { timeout: timeoutMs });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(run, 2000);
  return () => window.clearTimeout(id);
}
