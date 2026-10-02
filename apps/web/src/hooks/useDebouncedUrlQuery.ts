'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const DEFAULT_DEBOUNCE_MS = 450;

export interface UseDebouncedUrlQueryOptions {
  /** Query param key (default `q`). */
  param?: string;
  /** Legacy/alternate keys read for display until URL is normalized. */
  fallbackParams?: string[];
  debounceMs?: number;
  /** e.g. colon-safe entity ids on teams compare URLs */
  serializeParams?: (_params: URLSearchParams) => string;
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
  const serializeParams = options.serializeParams;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryFromUrl = readQueryParam(searchParams, param, fallbackParams);

  const [input, setInput] = useState(queryFromUrl);

  /**
   * The last value this hook wrote to the URL itself.
   *
   * Without this, typing loses a character. The input is synced back from the URL on
   * every URL change, and the URL changes *because* of what was typed — so the echo of
   * our own write lands on top of the keystrokes that came after it:
   *
   *   type "abc"           → timer fires, router.replace("?q=abc")
   *   type "d"             → input is "abcd"
   *   URL becomes "abc"    → setInput("abc")   ← the "d" is gone
   *
   * The longer the debounce, the wider that window: the whole point of a longer debounce
   * is to let the user keep typing while the timer runs, which is exactly when the
   * keystrokes get overwritten. So the URL is only treated as authoritative when it says
   * something this hook did not say — a back/forward navigation, a shared link, a reset
   * from elsewhere.
   */
  const lastWritten = useRef<string | null>(null);

  useEffect(() => {
    if (queryFromUrl === lastWritten.current) return;
    lastWritten.current = null;
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
      const serialize = serializeParams ?? ((nextParams: URLSearchParams) => nextParams.toString());
      const qs = serialize(params);
      // Recorded before the navigation so the resulting URL change is recognised as ours.
      lastWritten.current = trimmed;
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    }, debounceMs);

    return () => window.clearTimeout(timer);
  }, [input, queryFromUrl, param, debounceMs, pathname, router, searchParams, serializeParams]);

  return { input, setInput, query: queryFromUrl };
}
