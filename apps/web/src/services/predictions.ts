import { ApiError, apiGet, apiGetOptional, apiPost, extractPage } from './api/client';
import { authHeaders } from './auth';
import type {
  AdminPredictionCalibration,
  AdminPredictionModelVersion,
  AdminPredictionRunDetail,
  BulkPredictionsResponse,
  MatchPredictions,
  PredictionChart,
  PredictionHistory,
  PredictionPerformance,
} from '../types/predictions';

function normalizeMatchId(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchPredictionPerformance(): Promise<PredictionPerformance> {
  return apiGet<PredictionPerformance>('/predictions/performance', undefined, { revalidate: 60 });
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

/* ─── Bulk ─────────────────────────────────────────────────── */

/** The API's ValidationPipe rejects the whole batch if any id is malformed. */
const BULK_ID_PATTERN = /^sr:match:[A-Za-z0-9][A-Za-z0-9_-]*$/;
/** Server-side `@ArrayMaxSize(50)`. */
const BULK_MAX_IDS = 50;

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

async function postBulkChunk(ids: string[]): Promise<Record<string, MatchPredictions>> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const res = await apiPost<BulkPredictionsResponse>('/predictions/bulk', { matchIds: ids });
      return res?.data ?? {};
    } catch (error) {
      if (error instanceof ApiError && error.status === 429 && attempt < 3) {
        await wait(450 * (attempt + 1));
        continue;
      }
      // Matches are still worth showing without a prediction, so a failed chunk
      // degrades to "no prediction" instead of taking the page down.
      return {};
    }
  }
  return {};
}

/**
 * Latest pre-match and live runs for many matches in one round trip, instead of
 * one request per match id. Ids the API would reject are reported as `null`
 * (same as a 404 on the single-match route) rather than failing the whole batch.
 */
export async function fetchBulkPredictions(
  matchIds: string[]
): Promise<Map<string, MatchPredictions | null>> {
  const unique = [...new Set(matchIds.map((id) => String(id || '').trim()).filter(Boolean))];
  const result = new Map<string, MatchPredictions | null>(unique.map((id) => [id, null]));
  const accepted = unique.filter((id) => BULK_ID_PATTERN.test(id));
  if (accepted.length === 0) return result;

  const rows = await Promise.all(chunk(accepted, BULK_MAX_IDS).map(postBulkChunk));
  for (const data of rows) {
    for (const [matchId, predictions] of Object.entries(data)) {
      if (predictions) result.set(matchId, predictions);
    }
  }
  return result;
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
): Promise<{ items: AdminPredictionRunDetail[]; total: number; totalPages: number }> {
  const res = await apiGet('/admin/predictions/runs', { page: 1, limit: 20, ...params }, {
    headers: authHeaders(),
  });
  const { items, meta } = extractPage<AdminPredictionRunDetail>(res);
  return { items, total: meta.total, totalPages: meta.totalPages };
}

export async function fetchAdminPredictionRun(runId: string): Promise<AdminPredictionRunDetail> {
  return apiGet<AdminPredictionRunDetail>(`/admin/predictions/runs/${runId}`, undefined, {
    headers: authHeaders(),
  });
}
