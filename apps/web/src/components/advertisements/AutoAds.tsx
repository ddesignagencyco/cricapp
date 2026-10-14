'use client';

import { useEffect } from 'react';
import { useAdConfig } from './AdProvider';
import { resolveAutoAdsConfig, resolvePublisherId } from '../../lib/advertisements/adsConfig';

/**
 * Page-level Auto Ads driver (anchor + vignette, requirements §6–§7).
 *
 * The `adsbygoogle.js` script tag (mounted once by `AdProvider`) only loads
 * the library. Auto Ads formats additionally need one page-level request:
 *
 * ```js
 * (adsbygoogle = window.adsbygoogle || []).push({
 *   google_ad_client: 'ca-pub-…',
 *   enable_page_level_ads: true,
 * });
 * ```
 *
 * This component issues exactly that, once per mount, and only when:
 * - site ads are in `adsense` mode with a resolvable publisher id, AND
 * - `NEXT_PUBLIC_ADSENSE_AUTO_ADS=1` is set.
 *
 * The AdSense dashboard decides whether anchor/vignette actually render; this
 * push merely makes the site *eligible*. Rendered once in the root layout next
 * to the script tag — never per page, so client-side navigation cannot
 * duplicate the request.
 */
export default function AutoAds() {
  const config = useAdConfig();

  useEffect(() => {
    if (config.mode !== 'adsense') return;
    const auto = resolveAutoAdsConfig();
    if (!auto.enabled) return;
    const clientId = resolvePublisherId(config.clientId);
    if (!clientId) return;

    try {
      const w = window as unknown as { adsbygoogle?: unknown };
      const existing = w.adsbygoogle as { push?: unknown } | undefined;
      if (existing && typeof existing.push === 'function') {
        (existing.push as (_options: object) => void).call(existing, {
          google_ad_client: clientId,
          enable_page_level_ads: true,
        });
      } else {
        w.adsbygoogle = [
          ...(Array.isArray(existing) ? existing : []),
          { google_ad_client: clientId, enable_page_level_ads: true },
        ] as unknown;
      }
    } catch {
      // Page-level eligibility is best-effort; a failure must never break the page.
    }
  }, [config.mode, config.clientId]);

  return null;
}
