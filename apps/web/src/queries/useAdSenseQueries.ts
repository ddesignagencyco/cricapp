'use client';

import { useQuery } from '@tanstack/react-query';
import { adSenseKeys } from './keys';
import { runAbortable } from './queryUtils';
import {
  fetchAdSenseAdUnits,
  fetchAdSensePolicyIssues,
  fetchAdSenseReport,
  fetchAdSenseStatus,
  type AdSenseReportQueryInput,
} from '../services/adsense';

/**
 * Only `status` makes no upstream call. Every other route throws 503 when the API
 * service has no AdSense credentials, so all three panels stay disabled until
 * `status.configured` is true rather than each firing a request that 503s.
 */

export function useAdSenseStatusQuery() {
  return useQuery({
    queryKey: adSenseKeys.status(),
    queryFn: ({ signal }) => runAbortable(signal, (s) => fetchAdSenseStatus(s)),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdSenseAdUnitsQuery(includeArchived = false, enabled = true) {
  return useQuery({
    queryKey: adSenseKeys.adUnits(includeArchived),
    queryFn: ({ signal }) => runAbortable(signal, (s) => fetchAdSenseAdUnits(includeArchived, s)),
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useAdSensePolicyIssuesQuery(enabled = true) {
  return useQuery({
    queryKey: adSenseKeys.policyIssues(),
    queryFn: ({ signal }) => runAbortable(signal, (s) => fetchAdSensePolicyIssues(s)),
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useAdSenseReportQuery(query: AdSenseReportQueryInput, enabled = true) {
  return useQuery({
    queryKey: adSenseKeys.report(query as Record<string, unknown>),
    queryFn: ({ signal }) => runAbortable(signal, (s) => fetchAdSenseReport(query, s)),
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}