import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  EMPTY_AD_CONFIG,
  normalizeAdConfig,
  toAdConfigJson,
  type AdConfig,
  type AdPlacementConfig,
} from './ad.config.js';
import type { SiteSocialLinkDto, UpdateSiteSettingsDto } from './dto/site-settings.dto.js';

export type SiteSettingsView = {
  email: string | null;
  supportEmail: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  mapsUrl: string | null;
  workingHours: string | null;
  socials: SiteSocialLinkDto[];
  ads: AdConfig;
  updatedAt: string | null;
};

const SETTINGS_ID = 'default';

type AdPlacementPatch = { enabled?: boolean; slotId?: string | null };

/**
 * Merges placement overrides per key, and per field within a key. A flat spread
 * would be wrong: re-enabling one placement sends only `{ enabled: true }`, and
 * a flat merge would drop the ad unit id the admin configured for it.
 */
function mergePlacements(
  base: Record<string, AdPlacementConfig>,
  incoming: Record<string, AdPlacementPatch>,
): Record<string, AdPlacementConfig> {
  const merged: Record<string, AdPlacementConfig> = { ...base };
  for (const [key, patch] of Object.entries(incoming)) {
    const existing = merged[key];
    merged[key] = {
      enabled: patch.enabled ?? existing?.enabled ?? true,
      slotId: patch.slotId !== undefined ? patch.slotId : (existing?.slotId ?? null),
    };
  }
  return merged;
}

@Injectable()
export class SiteSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private toView(row: {
    email: string | null;
    supportEmail: string | null;
    phone: string | null;
    whatsapp: string | null;
    address: string | null;
    city: string | null;
    country: string | null;
    mapsUrl: string | null;
    workingHours: string | null;
    socials: Prisma.JsonValue;
    ads: Prisma.JsonValue;
    updatedAt: Date;
  } | null): SiteSettingsView {
    const socials = Array.isArray(row?.socials)
      ? (row!.socials as unknown as SiteSocialLinkDto[])
      : [];
    return {
      email: row?.email ?? null,
      supportEmail: row?.supportEmail ?? null,
      phone: row?.phone ?? null,
      whatsapp: row?.whatsapp ?? null,
      address: row?.address ?? null,
      city: row?.city ?? null,
      country: row?.country ?? null,
      mapsUrl: row?.mapsUrl ?? null,
      workingHours: row?.workingHours ?? null,
      socials,
      ads: normalizeAdConfig(row?.ads),
      updatedAt: row?.updatedAt?.toISOString() ?? null,
    };
  }

  async getPublic(): Promise<SiteSettingsView> {
    const row = await this.prisma.siteSettings.findUnique({ where: { id: SETTINGS_ID } });
    return this.toView(row);
  }

  async update(dto: UpdateSiteSettingsDto): Promise<SiteSettingsView> {
    const socials =
      dto.socials?.filter((s) => s.platform?.trim() && s.value?.trim()) ?? undefined;

    // A partial ads payload merges over the stored config so toggling one
    // placement from the admin screen cannot drop the other 24.
    let ads: AdConfig | undefined;
    if (dto.ads !== undefined) {
      const current = await this.prisma.siteSettings.findUnique({
        where: { id: SETTINGS_ID },
        select: { ads: true },
      });
      const base = current ? normalizeAdConfig(current.ads) : { ...EMPTY_AD_CONFIG };
      ads = normalizeAdConfig({
        ...base,
        ...(dto.ads.mode !== undefined ? { mode: dto.ads.mode } : {}),
        ...(dto.ads.clientId !== undefined ? { clientId: dto.ads.clientId } : {}),
        ...(dto.ads.defaultSlots !== undefined
          ? { defaultSlots: { ...base.defaultSlots, ...dto.ads.defaultSlots } }
          : {}),
        ...(dto.ads.placements !== undefined
          ? { placements: mergePlacements(base.placements, dto.ads.placements) }
          : {}),
        ...(dto.ads.gamblingAds !== undefined ? { gamblingAds: dto.ads.gamblingAds } : {}),
      });
    }

    const row = await this.prisma.siteSettings.upsert({
      where: { id: SETTINGS_ID },
      create: {
        id: SETTINGS_ID,
        email: dto.email?.trim() || null,
        supportEmail: dto.supportEmail?.trim() || null,
        phone: dto.phone?.trim() || null,
        whatsapp: dto.whatsapp?.trim() || null,
        address: dto.address?.trim() || null,
        city: dto.city?.trim() || null,
        country: dto.country?.trim() || null,
        mapsUrl: dto.mapsUrl?.trim() || null,
        workingHours: dto.workingHours?.trim() || null,
        socials: (socials ?? []) as unknown as Prisma.InputJsonValue,
        ads: toAdConfigJson(ads ?? { ...EMPTY_AD_CONFIG }),
      },
      update: {
        ...(dto.email !== undefined ? { email: dto.email.trim() || null } : {}),
        ...(dto.supportEmail !== undefined
          ? { supportEmail: dto.supportEmail.trim() || null }
          : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone.trim() || null } : {}),
        ...(dto.whatsapp !== undefined ? { whatsapp: dto.whatsapp.trim() || null } : {}),
        ...(dto.address !== undefined ? { address: dto.address.trim() || null } : {}),
        ...(dto.city !== undefined ? { city: dto.city.trim() || null } : {}),
        ...(dto.country !== undefined ? { country: dto.country.trim() || null } : {}),
        ...(dto.mapsUrl !== undefined ? { mapsUrl: dto.mapsUrl.trim() || null } : {}),
        ...(dto.workingHours !== undefined
          ? { workingHours: dto.workingHours.trim() || null }
          : {}),
        ...(socials !== undefined
          ? { socials: socials as unknown as Prisma.InputJsonValue }
          : {}),
        ...(ads !== undefined ? { ads: toAdConfigJson(ads) } : {}),
      },
    });

    return this.toView(row);
  }
}
