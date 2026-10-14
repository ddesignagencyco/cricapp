'use client';

/**
 * Vignette-ad integration point (requirements §7).
 *
 * Vignette (full-screen interstitial on navigation) is an Auto Ads format with
 * no `<ins>` unit — Google triggers it on natural page transitions once it is
 * enabled. This component intentionally renders nothing.
 *
 * Activation:
 * 1. Set `NEXT_PUBLIC_ADSENSE_AUTO_ADS=1` and `NEXT_PUBLIC_ADSENSE_VIGNETTE=1`
 *    (see `docs/ads.md`), which makes `AutoAds` request page-level ads.
 * 2. Enable the Vignette format in the AdSense dashboard
 *    (Ads → Auto ads → Vignette ads). Frequency capping stays under Google's
 *    control; normal navigation is never blocked.
 *
 * Do NOT build a custom popup/modal ad — that would be a fake interstitial,
 * break navigation, and violate AdSense policy.
 */
export default function AdVignette() {
  return null;
}
