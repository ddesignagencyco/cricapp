'use client';

import { useEffect, useState } from 'react';

const DEFAULT_DEBOUNCE_MS = 350;

/** Debounce local state (client-only filters, no URL). */
export function useDebouncedValue<T>(value: T, debounceMs = DEFAULT_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), debounceMs);
    return () => window.clearTimeout(timer);
  }, [value, debounceMs]);

  return debounced;
}
