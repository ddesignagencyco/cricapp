import { apiGet, apiPut } from './api/client';
import { authHeaders } from './auth';
import type { SocialPlatformId } from '../lib/socialPlatforms';
import { EMPTY_AD_CONFIG, type AdConfig, type AdConfigInput } from '../lib/advertisements/registry';

export type { AdConfig, AdConfigInput, AdMode, AdSize, AdPlacementConfig } from '../lib/advertisements/registry';

export type SiteSocialLink = {
  platform: SocialPlatformId | string;
  value: string;
};

export type SiteSettings = {
  email: string | null;
  supportEmail: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  mapsUrl: string | null;
  workingHours: string | null;
  socials: SiteSocialLink[];
  ads: AdConfig;
  updatedAt: string | null;
};

/**
 * Every field is optional and omitted fields are left untouched by the API.
 * `ads` merges per field and per placement key, so toggling one slot does not
 * wipe the rest of the config.
 */
export type SiteSettingsInput = {
  email?: string;
  supportEmail?: string;
  phone?: string;
  whatsapp?: string;
  address?: string;
  city?: string;
  country?: string;
  mapsUrl?: string;
  workingHours?: string;
  socials?: SiteSocialLink[];
  ads?: AdConfigInput;
};

export const EMPTY_SITE_SETTINGS: SiteSettings = {
  email: null,
  supportEmail: null,
  phone: null,
  whatsapp: null,
  address: null,
  city: null,
  country: null,
  mapsUrl: null,
  workingHours: null,
  socials: [],
  ads: EMPTY_AD_CONFIG,
  updatedAt: null,
};

/**
 * The API always returns `ads` fully populated — absent values are explicit
 * `null`, never `undefined`, and bad stored values are repaired on read. This
 * only guards the case where an older build without the `ads` column is deployed
 * alongside this frontend, where every slot gate would otherwise read
 * `undefined.mode` and throw.
 */
function withAds(settings: SiteSettings): SiteSettings {
  if (settings.ads && typeof settings.ads === 'object' && settings.ads.mode) return settings;
  return { ...settings, ads: EMPTY_AD_CONFIG };
}

export function formatSiteLocation(settings: Pick<SiteSettings, 'address' | 'city' | 'country'>): string {
  const street = settings.address?.trim() || '';
  const place = [settings.city?.trim(), settings.country?.trim()].filter(Boolean).join(', ');
  if (street && place) return `${street}, ${place}`;
  return street || place;
}

export function publicSocials(settings: Pick<SiteSettings, 'socials'>): SiteSocialLink[] {
  return (settings.socials || []).filter((item) => item.platform?.trim() && item.value?.trim());
}

export function mapsHref(url?: string | null): string | null {
  const raw = url?.trim() || '';
  return /^https?:\/\//i.test(raw) ? raw : null;
}

export function fetchSiteSettings(signal?: AbortSignal): Promise<SiteSettings> {
  return apiGet<SiteSettings>('/site-settings', undefined, { signal }).then(withAds);
}

export async function loadSiteSettings(): Promise<SiteSettings> {
  try {
    return await apiGet<SiteSettings>('/site-settings', undefined, { revalidate: 60 }).then(withAds);
  } catch {
    return EMPTY_SITE_SETTINGS;
  }
}

export function saveSiteSettings(input: SiteSettingsInput): Promise<SiteSettings> {
  return apiPut<SiteSettings>('/admin/site-settings', input, { headers: authHeaders() }).then(withAds);
}

/**
 * `ads` merges per field and per placement key server-side, so the admin screen
 * can send a single placement toggle without resending the whole config.
 *
 * The response is the source of truth: a malformed slot id returns 200 with the
 * value silently normalised to `null`, so callers must reconcile from the returned
 * object rather than assume the input round-tripped.
 */
export function saveAdConfig(ads: AdConfigInput): Promise<SiteSettings> {
  return saveSiteSettings({ ads });
}