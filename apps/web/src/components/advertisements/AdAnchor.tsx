'use client';

/**
 * Anchor-ad integration point (requirements §6).
 *
 * Anchor ads have no `<ins>` unit: Google renders them itself at the viewport
 * edge once page-level Auto Ads is enabled for the site. This component
 * therefore intentionally renders nothing — it exists so pages declare intent
 * (`<AdAnchor />` in the layout) and so policy review has one place to audit.
 *
 * Activation is two-part, both outside code review:
 * 1. Set `NEXT_PUBLIC_ADSENSE_AUTO_ADS=1` and `NEXT_PUBLIC_ADSENSE_ANCHOR=1`
 *    (see `docs/ads.md`), which makes `AutoAds` request page-level ads.
 * 2. Enable the Anchor format in the AdSense dashboard
 *    (Ads → Auto ads → Anchor ads). The dashboard toggle is the source of
 *    truth; this component can never force an anchor on by itself.
 *
 * Do NOT replace this with a custom sticky div — that would be a fake ad,
 * violate AdSense policy, and risk covering navigation or cookie UI.
 */
export default function AdAnchor() {
  return null;
}
