import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../services/api/client';
import { QUERY_GC_TIME, QUERY_STALE_TIME } from './constants';

const NON_RETRYABLE_STATUSES = new Set([400, 401, 403, 404]);

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && NON_RETRYABLE_STATUSES.has(error.status)) return false;
  return failureCount < 1;
}

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: QUERY_STALE_TIME,
        gcTime: QUERY_GC_TIME,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        retry: shouldRetry,
        retryDelay: 500,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') return makeQueryClient();
  if (!browserQueryClient) browserQueryClient = makeQueryClient();
  return browserQueryClient;
}
