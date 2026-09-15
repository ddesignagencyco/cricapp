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

export function fetchSiteSettings(): Promise<SiteSettings> {
  return apiGet<SiteSettings>('/site-settings');
}

export function saveSiteSettings(input: SiteSettingsInput): Promise<SiteSettings> {
  return apiPut<SiteSettings>('/admin/site-settings', input, { headers: authHeaders() });
}
