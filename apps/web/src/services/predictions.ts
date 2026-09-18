import { apiGet, apiGetOptional, extractPage } from './api/client';
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

export async function fetchMatchPredictions(matchId: string): Promise<MatchPredictions | null> {
  return apiGetOptional<MatchPredictions>(`/predictions/${normalizeMatchId(matchId)}`);
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
