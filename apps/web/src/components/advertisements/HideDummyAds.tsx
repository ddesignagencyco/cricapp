'use client';

import { useEffect } from 'react';

/** Hides dummy advertisements on error and 404 screens. */
export default function HideDummyAds() {
  useEffect(() => {
    document.documentElement.setAttribute('data-hide-dummy-ads', '');
    return () => {
      document.documentElement.removeAttribute('data-hide-dummy-ads');
    };
  }, []);

  return null;
}
