'use client';

import { useEffect } from 'react';

/**
 * Hides every ad slot on a screen that must never carry one — the error and
 * not-found pages. Applied via a `data-hide-ads` attribute on `<html>` rather than
 * per-slot props, so it covers slots rendered by shared layouts as well.
 */
export default function HideAds() {
  useEffect(() => {
    document.documentElement.setAttribute('data-hide-ads', '');
    return () => {
      document.documentElement.removeAttribute('data-hide-ads');
    };
  }, []);

  return null;
}