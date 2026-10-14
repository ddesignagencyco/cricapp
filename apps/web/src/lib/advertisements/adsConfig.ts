/**
 * Centralized conceptual placement map for the Google AdSense system.
 *
 * The storage-level registry (`registry.ts`) owns the exact slot keys the admin
 * screen offers. This module sits one layer above it and answers the questions
 * the requirements ask for:
 *
 * - which conceptual placements exist (`homepage_top`, `article_inline`, …)
 * - which registry key each one renders
 * - where each placement is used
 * - how Auto Ads formats (anchor / vignette) are configured
 *
 * No AdSense initialization lives here — `AdProvider` owns the single script
 * tag. No markup lives here either — `components/advertisements/*` owns that.
 * This module is a leaf (imports only the registry) so services, components
 * and tests can all depend on it without a cycle.
 */

import { adPlacementSize, type AdSize } from './registry';

/* ─── Conceptual placements (requirements §2) ─── */

export const AD_CONCEPTUAL_PLACEMENTS = [
  'homepage_top',
  'homepage_middle',
  'homepage_bottom',
  'article_top',
  'article_inline',
  'article_bottom',
  'listing_inline',
  'sidebar',
  'multiplex',
  'anchor',
  'vignette',
  'side_rail',
] as const;

export type AdConceptualPlacement = (typeof AD_CONCEPTUAL_PLACEMENTS)[number];

/**
 * Where each conceptual placement renders today. Several concepts share one
 * registry key on purpose: the registry key is what the admin configures and
 * what AdSense bills against, while the concept describes *intent* on a page.
 * `anchor` and `vignette` have no registry key at all — they are Auto Ads
 * formats enabled in the AdSense dashboard, documented in `docs/ads.md`.
 */
export const CONCEPTUAL_PLACEMENT_MAP: Record<
  AdConceptualPlacement,
  { registryKey: string | null; size: AdSize; usage: string }
> = {
  homepage_top: {
    registryKey: 'home-top-mobile',
    size: 'leaderboard',
    usage: 'Homepage hero-adjacent strip (mobile banner; desktop uses global-top on other pages).',
  },
  homepage_middle: {
    registryKey: 'home-mid',
    size: 'leaderboard',
    usage: 'Homepage mid-content banner between Upcoming Matches and PSL Spotlight.',
  },
  homepage_bottom: {
    registryKey: 'home-footer',
    size: 'leaderboard',
    usage: 'Homepage lower-content banner above the footer.',
  },
  article_top: {
    registryKey: 'news-detail-top',
    size: 'leaderboard',
    usage: 'Article pages, directly after the hero image and before the body copy.',
  },
  article_inline: {
    registryKey: 'news-detail-inarticle',
    size: 'large-rectangle',
    usage: 'Inside long article bodies, after the fourth paragraph.',
  },
  article_bottom: {
    registryKey: 'news-detail-after-related',
    size: 'leaderboard',
    usage: 'Article pages, after the body and related links (multiplex host).',
  },
  listing_inline: {
    registryKey: 'news-list-infeed',
    size: 'large-rectangle',
    usage: 'News/listing grids, as one in-feed card — never between every card.',
  },
  sidebar: {
    registryKey: 'news-detail-sidebar',
    size: 'medium-rectangle',
    usage: 'Sticky sidebar box on article/content pages with a two-column layout.',
  },
  multiplex: {
    registryKey: 'home-multiplex',
    size: 'leaderboard',
    usage: 'Multiplex (matched-content) unit: end of articles, bottom of long listings.',
  },
  anchor: {
    registryKey: null,
    size: 'mobile-banner',
    usage: 'Auto Ads anchor — no <ins> unit; enabled in the AdSense dashboard (see docs/ads.md).',
  },
  vignette: {
    registryKey: null,
    size: 'mobile-banner',
    usage: 'Auto Ads vignette — no <ins> unit; enabled in the AdSense dashboard (see docs/ads.md).',
  },
  side_rail: {
    registryKey: 'layout-sidebar',
    size: 'medium-rectangle',
    usage: 'Desktop-only side rail (≥1280px), never overlapping content or nav.',
  },
};

export function conceptualPlacementSize(name: AdConceptualPlacement): AdSize {
  const mapped = CONCEPTUAL_PLACEMENT_MAP[name]?.registryKey;
  return mapped ? adPlacementSize(mapped) : CONCEPTUAL_PLACEMENT_MAP[name].size;
}

/* ─── Publisher identity (requirements §3, §15) ─── */

/**
 * The publisher id, from the stored site config first and the environment
 * second. The backend-owned `ads.clientId` wins when present so the admin
 * screen keeps working; `NEXT_PUBLIC_ADSENSE_CLIENT` covers deployments where
 * site-settings have never been saved.
 *
 * Accepts `pub-…` or `ca-pub-…` and always returns the canonical `ca-pub-…`
 * form the AdSense tag expects, or `null` when nothing is configured.
 */
export function normalizePublisherId(raw: string | null | undefined): string | null {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(?:ca-)?pub-(\d{10,20})$/i);
  if (!match) return null;
  return `ca-pub-${match[1]}`;
}

export function resolvePublisherId(configClientId: string | null | undefined): string | null {
  return (
    normalizePublisherId(configClientId) ??
    normalizePublisherId(
      typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_ADSENSE_CLIENT : null,
    )
  );
}

/* ─── Auto Ads flags (requirements §6, §7) ─── */

export type AutoAdsConfig = {
  enabled: boolean;
  anchor: boolean;
  vignette: boolean;
};

function envFlag(name: string, fallback = false): boolean {
  const raw = typeof process !== 'undefined' ? process.env?.[name] : undefined;
  if (raw === undefined || raw === null) return fallback;
  return /^(1|true|yes|on)$/i.test(raw.trim());
}

/**
 * Page-level Auto Ads (which is what actually renders anchor and vignette
 * formats) is deliberately env-gated and off by default:
 *
 * - `NEXT_PUBLIC_ADSENSE_AUTO_ADS=1` — inject the page-level push
 * - `NEXT_PUBLIC_ADSENSE_ANCHOR=1` — allow anchor (requires Auto Ads + dashboard opt-in)
 * - `NEXT_PUBLIC_ADSENSE_VIGNETTE=1` — allow vignette (requires Auto Ads + dashboard opt-in)
 *
 * The dashboard toggle remains the source of truth; these flags only control
 * whether this frontend asks for page-level ads at all. Anchor/vignette can
 * never be forced on from code alone.
 */
export function resolveAutoAdsConfig(): AutoAdsConfig {
  const enabled = envFlag('NEXT_PUBLIC_ADSENSE_AUTO_ADS', false);
  return {
    enabled,
    anchor: enabled && envFlag('NEXT_PUBLIC_ADSENSE_ANCHOR', true),
    vignette: enabled && envFlag('NEXT_PUBLIC_ADSENSE_VIGNETTE', true),
  };
}
