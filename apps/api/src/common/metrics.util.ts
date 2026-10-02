import type { Redis } from 'ioredis';

const METRIC_PREFIX = 'metrics:counter:';

export type StaleNotRefreshedReason = 'not_configured' | 'too_recent' | 'fetch_failed';

/**
 * Increments a Redis-backed counter, mirroring a Prometheus-style name:
 * `timeline_stale_not_refreshed_total{reason}` -> metrics:counter:timeline_stale_not_refreshed_total{reason}
 *
 * Fire and forget: a counter must never fail a request.
 */
export function incrCounter(
  redis: Redis | undefined,
  name: string,
  labels: Record<string, string | number | null | undefined> = {},
): void {
  if (!redis) return;
  const suffix = Object.entries(labels)
    .filter(([, v]) => v != null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}="${v}"`)
    .join(',');
  const key = suffix ? `${METRIC_PREFIX}${name}{${suffix}}` : `${METRIC_PREFIX}${name}`;
  redis.incr(key).catch(() => {
    /* counters are best effort */
  });
}
