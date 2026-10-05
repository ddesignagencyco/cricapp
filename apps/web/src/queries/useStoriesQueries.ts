'use client';

import { useQuery } from '@tanstack/react-query';
import { fetchStories, fetchStoryById, type StoriesListParams, type StoriesPageResult, type Story } from '../services/stories';
import { normalizeParams, storiesKeys, type StoriesQueryParams } from './keys';
import { runAbortable } from './queryUtils';

/**
 * Stories hooks live in their own module rather than in `useDirectoryQueries`
 * because they are not a directory entity: the service merges two gallery types
 * into one list, so its params and result do not fit that file's shapes.
 */
export function useStoriesQuery(params: StoriesQueryParams, enabled = true) {
  const normalized = normalizeParams(params as Record<string, unknown>);
  const requestParams: StoriesListParams = {
    page: Number(normalized.page) || 1,
    limit: Number(normalized.limit) || 12,
  };
  return useQuery<StoriesPageResult, Error>({
    queryKey: storiesKeys.list(normalized),
    queryFn: ({ signal }) => runAbortable(signal, (requestSignal) => fetchStories(requestParams, requestSignal)),
    enabled,
  });
}

export function useStoryQuery(id: string | null | undefined, enabled = true) {
  const storyId = (id || '').trim();
  return useQuery<Story | null, Error>({
    queryKey: storiesKeys.detail(storyId),
    queryFn: ({ signal }) => runAbortable(signal, (requestSignal) => fetchStoryById(storyId, requestSignal)),
    enabled: enabled && storyId.length > 0,
  });
}
