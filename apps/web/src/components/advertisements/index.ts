/**
 * Reusable AdSense advertising components (one import surface).
 *
 * ```tsx
 * import { AdBanner, AdInArticle, AdMultiplex, AdSideRail } from '../components/advertisements';
 * ```
 */
export { default as AdProvider, useAdConfig } from './AdProvider';
export { default as AdSlot, type AdSlotProps, type AdUnitFormat } from './AdSlot';
export { default as AdBanner, type AdBannerProps } from './AdBanner';
export { default as AdInArticle, type AdInArticleProps } from './AdInArticle';
export { default as AdMultiplex, type AdMultiplexProps } from './AdMultiplex';
export { default as AdSideRail, type AdSideRailProps } from './AdSideRail';
export { default as AdAnchor } from './AdAnchor';
export { default as AdVignette } from './AdVignette';
export { SimulatedAnchor, SimulatedVignette } from './AdPreviewSimulators';
export { default as AutoAds } from './AutoAds';
export { default as HouseAd, type HouseAdProps } from './HouseAd';
export { default as HideAds } from './HideAds';
