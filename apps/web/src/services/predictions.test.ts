import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './api/client';

const post = vi.fn();
const get = vi.fn();

vi.mock('./api/client', async () => {
  const actual = await vi.importActual<typeof import('./api/client')>('./api/client');
  return {
    ...actual,
    apiPost: (...args: unknown[]) => post(...args),
    apiGet: (...args: unknown[]) => get(...args),
  };
});

vi.mock('./auth', () => ({ authHeaders: () => ({}) }));

const { fetchBulkPredictions } = await import('./predictions');

const run = (matchId: string) => ({ runId: `run-${matchId}`, matchId, homeWinProb: 0.5 });

beforeEach(() => {
  post.mockReset();
  get.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchBulkPredictions', () => {
  it('sends every match id in one request and maps the response back by id', async () => {
    post.mockResolvedValue({
      data: {
        'sr:match:1': { matchId: 'sr:match:1', preMatch: run('sr:match:1') },
        'sr:match:2': { matchId: 'sr:match:2', live: run('sr:match:2') },
      },
      meta: { requested: 2, returned: 2, missing: 0 },
    });

    const result = await fetchBulkPredictions(['sr:match:1', 'sr:match:2']);

    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/predictions/bulk', { matchIds: ['sr:match:1', 'sr:match:2'] });
    expect(result.get('sr:match:1')?.preMatch?.runId).toBe('run-sr:match:1');
    expect(result.get('sr:match:2')?.live?.runId).toBe('run-sr:match:2');
  });

  it('de-duplicates and trims ids', async () => {
    post.mockResolvedValue({ data: {}, meta: { requested: 1, returned: 0, missing: 1 } });

    await fetchBulkPredictions([' sr:match:1 ', 'sr:match:1', 'sr:match:1', '  ']);

    expect(post).toHaveBeenCalledWith('/predictions/bulk', { matchIds: ['sr:match:1'] });
  });

  it('keeps every requested id as a key, using null when the API has no run', async () => {
    post.mockResolvedValue({ data: {}, meta: { requested: 2, returned: 0, missing: 2 } });

    const result = await fetchBulkPredictions(['sr:match:1', 'sr:match:2']);

    expect(result.size).toBe(2);
    expect(result.get('sr:match:1')).toBeNull();
    expect(result.get('sr:match:2')).toBeNull();
  });

  it('never sends ids the API ValidationPipe would reject', async () => {
    post.mockResolvedValue({ data: {}, meta: { requested: 1, returned: 0, missing: 1 } });

    const result = await fetchBulkPredictions(['sr:match:ok', 'not-a-sr-id', '']);

    expect(post).toHaveBeenCalledWith('/predictions/bulk', { matchIds: ['sr:match:ok'] });
    // Rejected ids still resolve to null so the page can render them.
    expect(result.get('not-a-sr-id')).toBeNull();
  });

  it('skips the request entirely when no id is valid', async () => {
    const result = await fetchBulkPredictions(['bad-id', 'another-bad']);

    expect(post).not.toHaveBeenCalled();
    expect(result.size).toBe(2);
    expect(result.get('bad-id')).toBeNull();
  });

  it('splits requests at the 50 id server limit', async () => {
    const ids = Array.from({ length: 120 }, (_, i) => `sr:match:${i}`);
    post.mockResolvedValue({ data: {}, meta: { requested: 0, returned: 0, missing: 0 } });

    await fetchBulkPredictions(ids);

    expect(post).toHaveBeenCalledTimes(3);
    expect(post.mock.calls.map(([, body]) => (body as { matchIds: string[] }).matchIds.length)).toEqual([
      50, 50, 20,
    ]);
  });

  it('degrades to null predictions instead of throwing when the request fails', async () => {
    post.mockRejectedValue(new ApiError(500, 'Internal Server Error'));

    const result = await fetchBulkPredictions(['sr:match:1']);

    expect(result.get('sr:match:1')).toBeNull();
  });

  it('retries on 429 before giving up', async () => {
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: () => void) => {
      fn();
      return 0 as unknown as NodeJS.Timeout;
    }) as typeof setTimeout);
    post.mockRejectedValueOnce(new ApiError(429, 'Too Many Requests')).mockResolvedValue({
      data: { 'sr:match:1': { matchId: 'sr:match:1', preMatch: run('sr:match:1') } },
      meta: { requested: 1, returned: 1, missing: 0 },
    });

    const result = await fetchBulkPredictions(['sr:match:1']);

    expect(post).toHaveBeenCalledTimes(2);
    expect(result.get('sr:match:1')?.preMatch?.runId).toBe('run-sr:match:1');
  });
});
