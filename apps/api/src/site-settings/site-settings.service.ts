import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
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
  updatedAt: string | null;
};

const SETTINGS_ID = 'default';

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
      },
    });

    return this.toView(row);
  }
}
