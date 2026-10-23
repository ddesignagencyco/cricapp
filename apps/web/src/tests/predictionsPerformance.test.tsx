import { render, screen } from '@testing-library/react';
import {
  createAdminPerformanceSnapshot,
  fetchAdminPredictionModelWeights,
  fetchPredictionPerformanceHistory,
} from '../services/predictions';
import PredictionsHub from '../components/predictions/PredictionsHub';
import type { PredictionPerformance, PredictionPerformanceSnapshot } from '../types/predictions';

jest.mock('next/navigation', () => ({
  usePathname: () => '/predictions',
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock('../hooks/useMatchStream', () => ({
  useMatchStream: () => null,
  withLatestLive: (match: unknown) => match,
  mergeLiveRows: (_prev: unknown, next: unknown) => next,
  mergeLiveUpdate: (prev: unknown) => prev,
}));

const originalFetch = globalThis.fetch;

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as unknown as Response;
}

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn().mockResolvedValue(jsonResponse([]));
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('prediction performance services', () => {
  it('reads model weights from the admin endpoint', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse([{ id: 'w1', weights: { elo: 0.4 } }]));
    const rows = await fetchAdminPredictionModelWeights();
    expect(rows).toEqual([{ id: 'w1', weights: { elo: 0.4 } }]);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/admin/predictions/model-weights');
  });

  it('posts a snapshot with its options in the query string', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: 's1', sampleSize: 3, accuracy: 0.67 }));
    const snapshot = await createAdminPerformanceSnapshot({ stage: 'live' });
    expect(snapshot.id).toBe('s1');
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain('/api/admin/predictions/performance/snapshot?stage=live');
    expect(init.method).toBe('POST');
  });

  it('unwraps the history envelope', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ data: [{ id: 'h1' }], meta: { limit: 5 } }));
    await expect(fetchPredictionPerformanceHistory({ limit: 5 })).resolves.toEqual([{ id: 'h1' }]);
    expect(String(fetchMock.mock.calls[0][0])).toContain('/api/predictions/performance/history?limit=5');
  });
});

describe('PredictionsHub accuracy trend', () => {
  const performance: PredictionPerformance = {
    modelVersion: 'prematch-logit-v3',
    stage: 'pre_match',
    sampleSize: 250,
    accuracy: 0.62,
    claimReady: true,
    publishMinSamples: 200,
    byFormat: [],
    byConfidenceBand: [],
  };

  const snapshot = (id: string, accuracy: number, sampleSize = 220): PredictionPerformanceSnapshot => ({
    id,
    modelVersion: 'prematch-logit-v3',
    stage: 'pre_match',
    sampleSize,
    accuracy,
    brierScore: 0.2,
    expectedCalibrationError: 0.05,
    byFormat: [],
    byConfidenceBand: [],
    source: 'manual',
    createdAt: '2026-10-01T00:00:00Z',
  });

  const renderHub = (history: PredictionPerformanceSnapshot[]) =>
    render(
      <PredictionsHub
        performance={performance}
        performanceHistory={history}
        live={[]}
        upcoming={[]}
        upcomingPage={1}
        upcomingTotal={0}
        upcomingLimit={12}
      />
    );

  it('draws a sparkline oldest-to-newest from snapshots that cleared the threshold', () => {
    // Newest first, as the API returns them; the thin-sample snapshot is ignored.
    renderHub([snapshot('c', 0.62), snapshot('b', 0.58), snapshot('thin', 0.9, 10), snapshot('a', 0.55)]);
    expect(screen.getByRole('img', { name: /over 3 snapshots: 55% to 62%/ })).toBeInTheDocument();
  });

  it('shows no trend with fewer than two usable snapshots', () => {
    renderHub([snapshot('a', 0.6), snapshot('thin', 0.9, 10)]);
    expect(screen.queryByRole('img', { name: /Accuracy trend/ })).not.toBeInTheDocument();
  });
});
