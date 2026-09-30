import { describe, it, expect } from '@jest/globals';
import {
  EMPTY_AD_CONFIG,
  isValidAdUnitId,
  isValidAdPublisherId,
  normalizeAdConfig,
  normalizeAdUnitId,
  normalizePublisherId,
  suggestAdSizeForDimensions,
} from './ad.config.js';

describe('site-settings/ad.config', () => {
  describe('normalizePublisherId', () => {
    it('accepts the bare and the ca- prefixed publisher id', () => {
      expect(normalizePublisherId('pub-1234567890123456')).toBe('pub-1234567890123456');
      expect(normalizePublisherId('ca-pub-1234567890123456')).toBe('pub-1234567890123456');
      expect(normalizePublisherId('  CA-PUB-1234567890123456 ')).toBe('pub-1234567890123456');
    });

    it('rejects anything that is not a publisher id', () => {
      expect(normalizePublisherId('pub-abc')).toBeNull();
      expect(normalizePublisherId('1234567890123456')).toBeNull();
      expect(normalizePublisherId('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js')).toBeNull();
      expect(normalizePublisherId(undefined)).toBeNull();
      expect(normalizePublisherId(42)).toBeNull();
    });
  });

  describe('normalizeAdUnitId', () => {
    it('trims a numeric ad unit id', () => {
      expect(normalizeAdUnitId(' 1234567890 ')).toBe('1234567890');
      expect(isValidAdUnitId('1234567890')).toBe(true);
      expect(isValidAdPublisherId('pub-1234567890123456')).toBe(true);
    });

    it('discards malformed unit ids', () => {
      expect(normalizeAdUnitId('abc')).toBeNull();
      expect(normalizeAdUnitId('123')).toBeNull();
      expect(normalizeAdUnitId('pub-1234567890123456')).toBeNull();
      expect(normalizeAdUnitId('')).toBeNull();
    });
  });

  describe('suggestAdSizeForDimensions', () => {
    it('maps known AdSense sizes onto a placement size', () => {
      expect(suggestAdSizeForDimensions('728x90')).toBe('leaderboard');
      expect(suggestAdSizeForDimensions('468x60')).toBe('tablet-banner');
      expect(suggestAdSizeForDimensions('320x100')).toBe('mobile-banner');
      expect(suggestAdSizeForDimensions('300x250')).toBe('medium-rectangle');
      expect(suggestAdSizeForDimensions(' 336x280 ')).toBe('large-rectangle');
      expect(suggestAdSizeForDimensions('300x600')).toBe('half-page');
    });

    it('groups tall units under the half-page slot', () => {
      expect(suggestAdSizeForDimensions('160x600')).toBe('half-page');
      expect(suggestAdSizeForDimensions('320x480')).toBe('half-page');
    });

    it('returns null for responsive, unknown and non-string sizes', () => {
      expect(suggestAdSizeForDimensions('fluid')).toBeNull();
      expect(suggestAdSizeForDimensions('1x3')).toBeNull();
      expect(suggestAdSizeForDimensions('123x456')).toBeNull();
      expect(suggestAdSizeForDimensions(undefined)).toBeNull();
      expect(suggestAdSizeForDimensions(728)).toBeNull();
    });
  });

  describe('normalizeAdConfig', () => {
    it('falls back to the house-ad defaults for an empty document', () => {
      expect(normalizeAdConfig({})).toEqual(EMPTY_AD_CONFIG);
      expect(normalizeAdConfig(undefined)).toEqual(EMPTY_AD_CONFIG);
      expect(normalizeAdConfig('nonsense')).toEqual(EMPTY_AD_CONFIG);
      expect(normalizeAdConfig([1, 2, 3])).toEqual(EMPTY_AD_CONFIG);
    });

    it('does not blank the site when the mode is unrecognised', () => {
      expect(normalizeAdConfig({ mode: 'auto' }).mode).toBe('house');
    });

    it('keeps a valid mode, publisher id and per-size defaults', () => {
      const config = normalizeAdConfig({
        mode: 'adsense',
        clientId: 'ca-pub-1234567890123456',
        defaultSlots: {
          leaderboard: '1234567890',
          'medium-rectangle': 'not-a-slot',
          halfPage: '9999999999',
        },
      });

      expect(config.mode).toBe('adsense');
      expect(config.clientId).toBe('pub-1234567890123456');
      expect(config.defaultSlots.leaderboard).toBe('1234567890');
      expect(config.defaultSlots['medium-rectangle']).toBeNull();
      // Unknown size keys are ignored rather than stored.
      expect(config.defaultSlots['half-page']).toBeNull();
    });

    it('normalises placement overrides and lowercases their keys', () => {
      const config = normalizeAdConfig({
        placements: {
          'news-detail-inarticle': { enabled: true, slotId: ' 3456789012 ' },
          'prediction-detail-sidebar': { enabled: false, slotId: '4567890123' },
          'Home-Sidebar': { enabled: true },
          'bad key!': { enabled: true },
          broken: 'nope',
        },
      });

      expect(config.placements['news-detail-inarticle']).toEqual({
        enabled: true,
        slotId: '3456789012',
      });
      expect(config.placements['prediction-detail-sidebar']).toEqual({
        enabled: false,
        slotId: '4567890123',
      });
      expect(config.placements['home-sidebar']).toEqual({ enabled: true, slotId: null });
      expect(config.placements['bad key!']).toBeUndefined();
      expect(config.placements.broken).toBeUndefined();
    });

    it('treats a missing enabled flag as on', () => {
      const config = normalizeAdConfig({ placements: { 'layout-sidebar': {} } });
      expect(config.placements['layout-sidebar'].enabled).toBe(true);
    });

    it('only opts in to the betting routes on an explicit true', () => {
      expect(normalizeAdConfig({}).gamblingAds).toBe(false);
      expect(normalizeAdConfig({ gamblingAds: 'true' }).gamblingAds).toBe(false);
      expect(normalizeAdConfig({ gamblingAds: 1 }).gamblingAds).toBe(false);
      expect(normalizeAdConfig({ gamblingAds: true }).gamblingAds).toBe(true);
    });
  });
});
