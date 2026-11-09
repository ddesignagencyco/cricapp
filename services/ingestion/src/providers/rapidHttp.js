import { QuotaExceededError, ProviderAuthError } from './errors.js';

const REQUEST_TIMEOUT_MS = Number(process.env.RAPIDAPI_TIMEOUT_MS || 15000);

const stats = { calls: 0, cacheHits: 0, quotaBlocked: 0, lastError: null };

let store = null;

/** Redis by default (loaded lazily so unit tests need no connection). Tests inject their own. */
async function getStore() {
  if (!store) store = (await import('../redis.js')).default;
  return store;
}

export function setStore(s) {
  store = s;
}

export function getRapidStats() {
  return { ...stats };
}

function periodStamp(period, now = new Date()) {
  const iso = now.toISOString();
  return period === 'day' ? iso.slice(0, 10) : iso.slice(0, 7);
}

/**
 * Count one real HTTP call against the provider's free-tier budget. Increment first and
 * check the result, so two concurrent callers cannot both squeeze past the last request.
 */
async function spendBudget(s, provider, budget) {
  if (!budget) return;
  const key = `rapid:quota:${provider}:${periodStamp(budget.period)}`;
  const used = Number(await s.incr(key));
  if (used === 1) await s.expire(key, budget.period === 'day' ? 2 * 86400 : 40 * 86400);
  if (used > budget.limit) {
    stats.quotaBlocked += 1;
    throw new QuotaExceededError(
      `${provider} ${budget.period}ly budget of ${budget.limit} requests used up`,
    );
  }
}

/**
 * GET a RapidAPI endpoint with a Redis response cache and a request budget.
 * Cached responses cost no quota.
 */
export async function rapidGet({ provider, host, path, query = {}, ttlSeconds = 60, budget }) {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) throw new ProviderAuthError(`${provider}: RAPIDAPI_KEY is not set`);

  const s = await getStore();
  const qs = new URLSearchParams(
    Object.entries(query).sort(([a], [b]) => a.localeCompare(b)),
  ).toString();
  const cacheKey = `rapid:cache:${provider}:${path}${qs ? `?${qs}` : ''}`;

  const cached = await s.get(cacheKey);
  if (cached) {
    stats.cacheHits += 1;
    return JSON.parse(cached);
  }

  await spendBudget(s, provider, budget);

  const url = `https://${host}/${path}${qs ? `?${qs}` : ''}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, {
      headers: { 'x-rapidapi-key': apiKey, 'x-rapidapi-host': host },
      signal: controller.signal,
    });
  } catch (err) {
    stats.lastError = `${provider}: ${err.message}`;
    throw new Error(`${provider} request failed: ${path} (${err.name === 'AbortError' ? 'timeout' : err.message})`);
  } finally {
    clearTimeout(timer);
  }
  stats.calls += 1;

  if (!res.ok) {
    const body = (await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200);
    stats.lastError = `${provider} ${res.status}: ${path} ${body}`;
    if (res.status === 429) throw new QuotaExceededError(`${provider} answered 429: ${body}`);
    if (res.status === 401 || res.status === 403) {
      throw new ProviderAuthError(`${provider} ${res.status} (check RAPIDAPI_KEY and subscription): ${body}`);
    }
    throw new Error(`${provider} request failed (${res.status}): ${path} ${body}`);
  }

  const data = await res.json();
  await s.set(cacheKey, JSON.stringify(data), 'EX', ttlSeconds);
  return data;
}
