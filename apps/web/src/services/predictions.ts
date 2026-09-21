import { ApiError, apiGet, apiGetOptional, extractPage } from './api/client';
import { authHeaders } from './auth';
import type {
  AdminPredictionCalibration,
  AdminPredictionModelVersion,
  AdminPredictionRunDetail,
  MatchPredictions,
  PredictionChart,
  PredictionHistory,
  PredictionPerformance,
  PredictionRun,
} from '../types/predictions';

function normalizeMatchId(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

export async function fetchPredictionPerformance(): Promise<PredictionPerformance> {
  return apiGet<PredictionPerformance>('/predictions/performance', undefined, { revalidate: 60 });
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mapPool<T, R>(items: T[], limit: number, worker: (_item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const run = async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await worker(items[index]);
    }
  };
  const size = Math.max(1, Math.min(limit, items.length));
  await Promise.all(Array.from({ length: size }, () => run()));
  return results;
}

export async function fetchMatchPredictions(matchId: string): Promise<MatchPredictions | null> {
  const path = `/predictions/${normalizeMatchId(matchId)}`;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await apiGet<MatchPredictions>(path);
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) return null;
      if (error instanceof ApiError && error.status === 429 && attempt < 3) {
        await wait(450 * (attempt + 1));
        continue;
      }
      return null;
    }
  }
  return null;
}

export async function fetchPredictionsByMatchIds(
  matchIds: string[]
): Promise<Map<string, MatchPredictions | null>> {
  const unique = [...new Set(matchIds.map((id) => String(id || '').trim()).filter(Boolean))];
  const rows = await mapPool(unique, 2, async (id) => {
    const predictions = await fetchMatchPredictions(id);
    return [id, predictions] as const;
  });
  return new Map(rows);
}

export async function fetchPredictionHistory(matchId: string): Promise<PredictionHistory | null> {
  return apiGetOptional<PredictionHistory>(`/predictions/${normalizeMatchId(matchId)}/history`);
}

export async function fetchPredictionChart(matchId: string): Promise<PredictionChart | null> {
  return apiGetOptional<PredictionChart>(`/predictions/${normalizeMatchId(matchId)}/chart`);
}

export async function fetchAdminPredictionModels(): Promise<AdminPredictionModelVersion[]> {
  const res = await apiGet<AdminPredictionModelVersion[] | { data: AdminPredictionModelVersion[] }>(
    '/admin/predictions/model-versions',
    undefined,
    { headers: authHeaders() }
  );
  return Array.isArray(res) ? res : res?.data || [];
}

export async function fetchAdminPredictionCalibration(params: {
  modelVersion?: string;
  bins?: number;
} = {}): Promise<AdminPredictionCalibration> {
  return apiGet<AdminPredictionCalibration>('/admin/predictions/calibration', params, {
    headers: authHeaders(),
  });
}

export async function fetchAdminPredictionRuns(
  params: {
    page?: number;
    limit?: number;
    matchId?: string;
    stage?: string;
    modelVersion?: string;
  } = {}
): Promise<{ items: PredictionRun[]; total: number; totalPages: number }> {
  const res = await apiGet('/admin/predictions/runs', { page: 1, limit: 20, ...params }, {
    headers: authHeaders(),
  });
  const { items, meta } = extractPage<PredictionRun>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}

export async function fetchAdminPredictionRun(runId: string): Promise<AdminPredictionRunDetail> {
  return apiGet<AdminPredictionRunDetail>(`/admin/predictions/runs/${runId}`, undefined, {
    headers: authHeaders(),
  });
}
