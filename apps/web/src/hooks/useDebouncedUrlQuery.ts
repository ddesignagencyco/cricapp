'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const DEFAULT_DEBOUNCE_MS = 350;

export interface UseDebouncedUrlQueryOptions {
  /** Query param key (default `q`). */
  param?: string;
  /** Legacy/alternate keys read for display until URL is normalized. */
  fallbackParams?: string[];
  debounceMs?: number;
  /** e.g. colon-safe entity ids on teams compare URLs */
  serializeParams?: (params: URLSearchParams) => string;
}

function readQueryParam(params: URLSearchParams, primary: string, fallbacks: string[]): string {
  const main = params.get(primary);
  if (main !== null && main !== '') return main;
  for (const key of fallbacks) {
    const value = params.get(key);
    if (value !== null && value !== '') return value;
  }
  return '';
}

/**
 * Controlled search input synced to the URL after debounce (replace, resets `page`).
 */
export function useDebouncedUrlQuery(options: UseDebouncedUrlQueryOptions = {}) {
  const param = options.param ?? 'q';
  const fallbackParams = options.fallbackParams ?? (param === 'q' ? ['search'] : param === 'search' ? ['q'] : []);
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  const serializeParams = options.serializeParams ?? ((params: URLSearchParams) => params.toString());

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryFromUrl = readQueryParam(searchParams, param, fallbackParams);

  const [input, setInput] = useState(queryFromUrl);

  useEffect(() => {
    setInput(queryFromUrl);
  }, [queryFromUrl]);

  useEffect(() => {
    const trimmed = input.trim();
    const urlTrimmed = queryFromUrl.trim();
    if (trimmed === urlTrimmed) return;

    const timer = window.setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (trimmed) params.set(param, trimmed);
      else params.delete(param);
      if (param === 'q') params.delete('search');
      if (param === 'search') params.delete('q');
      params.delete('page');
      const qs = serializeParams(params);
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [input, queryFromUrl, param, debounceMs, pathname, router, searchParams, serializeParams]);

  return { input, setInput, query: queryFromUrl };
}
