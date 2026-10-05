'use client';

import Script from 'next/script';
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { EMPTY_AD_CONFIG, type AdConfig } from '../../lib/advertisements/registry';
import { resolvePublisherId } from '../../lib/advertisements/adsConfig';
import AutoAds from './AutoAds';

const AdConfigContext = createContext<AdConfig>(EMPTY_AD_CONFIG);

/**
 * The site-wide ad config, read from the `ads` block of `GET /site-settings`.
 *
 * Defaults to `EMPTY_AD_CONFIG` (mode `house`) so a slot rendered outside the
 * provider degrades to today's placeholder behaviour rather than throwing.
 */
export function useAdConfig(): AdConfig {
  return useContext(AdConfigContext);
}

/**
 * Mounted once in the root layout. Holds the config for every slot and loads the
 * AdSense tag at most once per document — `next/script` deduplicates on `id`, and
 * the tag is only injected in `adsense` mode with a publisher id configured.
 *
 * The publisher id resolves from the stored site config first and falls back to
 * `NEXT_PUBLIC_ADSENSE_CLIENT`, so deployments that never saved site-settings
 * still serve real ads. `AutoAds` (page-level eligibility for anchor/vignette)
 * mounts alongside the tag and self-gates on its own env flags.
 */
export default function AdProvider({
  config,
  children,
}: {
  config?: AdConfig | null;
  children: ReactNode;
}) {
  const value = useMemo(() => config ?? EMPTY_AD_CONFIG, [config]);

  const clientId = value.mode === 'adsense' ? resolvePublisherId(value.clientId) : null;

  return (
    <AdConfigContext.Provider value={value}>
      {children}
      {clientId ? (
        <>
          <Script
            id="adsbygoogle"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`}
            strategy="afterInteractive"
            crossOrigin="anonymous"
          />
          <AutoAds />
        </>
      ) : null}
    </AdConfigContext.Provider>
  );
}