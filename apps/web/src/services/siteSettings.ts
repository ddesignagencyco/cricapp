import { apiGet, apiPut } from './api/client';
import { authHeaders } from './auth';
import type { SocialPlatformId } from '../lib/socialPlatforms';

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
  updatedAt: string | null;
};

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
  updatedAt: null,
};

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

export function fetchSiteSettings(): Promise<SiteSettings> {
  return apiGet<SiteSettings>('/site-settings');
}

export async function loadSiteSettings(): Promise<SiteSettings> {
  try {
    return await apiGet<SiteSettings>('/site-settings', undefined, { revalidate: 60 });
  } catch {
    return EMPTY_SITE_SETTINGS;
  }
}

export function saveSiteSettings(input: SiteSettingsInput): Promise<SiteSettings> {
  return apiPut<SiteSettings>('/admin/site-settings', input, { headers: authHeaders() });
}
