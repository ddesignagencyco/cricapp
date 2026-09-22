import { ApiError, apiGet, apiPost } from './api/client';
import type {
  MatchOddsFetchResult,
  MatchOddsResponse,
  OddsConvertResponse,
  OddsHistoryResponse,
  OddsMarginResponse,
} from '../types/odds';

function normalizeMatchId(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

function oddsMatchPath(matchId: string): string {
  return `/odds/${encodeURIComponent(normalizeMatchId(matchId))}`;
}

export async function fetchMatchOdds(
  matchId: string,
  options?: { revalidate?: number | false },
): Promise<MatchOddsFetchResult> {
  try {
    const data = await apiGet<MatchOddsResponse>(oddsMatchPath(matchId), undefined, {
      revalidate: options?.revalidate ?? 30,
    });
    return { status: 'ok', data };
  } catch (error) {
    if (error instanceof ApiError && error.status === 403) return { status: 'forbidden' };
    if (error instanceof ApiError && error.status === 404) return { status: 'not_found' };
    throw error;
  }
}

export async function convertOdds(
  from: 'decimal' | 'fractional' | 'american',
  value: string,
): Promise<OddsConvertResponse | null> {
  try {
    return await apiGet<OddsConvertResponse>('/odds/tools/convert', { from, value });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 400)) return null;
    throw error;
  }
}

export async function fetchOddsMargin(decimals: number[]): Promise<OddsMarginResponse | null> {
  try {
    return await apiPost<OddsMarginResponse>('/odds/tools/margin', { decimals });
  } catch (error) {
    if (error instanceof ApiError && error.status === 400) return null;
    throw error;
  }
}

export async function fetchOddsHistory(
  matchId: string,
  params?: { marketKey?: string; selectionKey?: string; limit?: number },
  options?: { revalidate?: number | false },
): Promise<OddsHistoryResponse | null> {
  try {
    return await apiGet<OddsHistoryResponse>(`${oddsMatchPath(matchId)}/history`, params, {
      revalidate: options?.revalidate ?? 60,
    });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 403)) return null;
    throw error;
  }
}
