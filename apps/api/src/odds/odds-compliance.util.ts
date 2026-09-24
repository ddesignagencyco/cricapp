import type { ConfigService } from '@nestjs/config';

export interface OddsComplianceEnvelope {
  publicEnabled: boolean;
  regionAllowed: boolean;
  ageGatingRequired: boolean;
  advertisingRestricted: boolean;
  responsibleUseMessage: string;
  disclaimer: string;
}

const DEFAULT_MESSAGE =
  'Odds are for information only. Compare prices across licensed sources. Gambling can be addictive — please play responsibly.';

const DEFAULT_DISCLAIMER =
  'Best displayed price is informational only and does not imply guaranteed profit.';

export function buildOddsCompliance(
  cfg: ConfigService,
  requestRegion?: string | null,
): OddsComplianceEnvelope {
  const publicEnabled = cfg.get<string>('ODDS_PUBLIC_ENABLED', 'false') === 'true';
  const allowedRegions = cfg.get<string>('ODDS_ALLOWED_REGIONS', '*').trim();
  const region = (requestRegion ?? cfg.get<string>('ODDS_REQUEST_REGION', '')).trim();
  const regionAllowed =
    allowedRegions === '*' ||
    allowedRegions === '' ||
    (region !== '' &&
      allowedRegions
        .split(',')
        .map((r) => r.trim().toUpperCase())
        .includes(region.toUpperCase()));

  return {
    publicEnabled,
    regionAllowed,
    ageGatingRequired: cfg.get<string>('ODDS_AGE_GATING_REQUIRED', 'true') === 'true',
    advertisingRestricted: cfg.get<string>('ODDS_ADVERTISING_RESTRICTED', 'true') === 'true',
    responsibleUseMessage: cfg.get<string>('ODDS_RESPONSIBLE_USE_MESSAGE', DEFAULT_MESSAGE),
    disclaimer: cfg.get<string>('ODDS_PRICE_DISCLAIMER', DEFAULT_DISCLAIMER),
  };
}

/**
 * Resolve the visitor's country/region from CDN geo headers.
 * Header names are configurable via ODDS_REGION_HEADER (comma-separated,
 * checked in order). Defaults cover Cloudflare and Vercel.
 * Returns null when no geo header is present (compliance then falls back
 * to the static ODDS_REQUEST_REGION env, if set).
 */
export function regionFromHeaders(
  cfg: ConfigService,
  headers: Record<string, string | string[] | undefined>,
): string | null {
  const names = cfg
    .get<string>('ODDS_REGION_HEADER', 'cf-ipcountry,x-vercel-ip-country')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  for (const name of names) {
    const value = headers[name];
    const resolved = Array.isArray(value) ? value[0] : value;
    if (resolved && resolved.trim() && resolved.trim() !== 'XX') {
      return resolved.trim();
    }
  }
  return null;
}

export function oddsAccessBlocked(compliance: OddsComplianceEnvelope): boolean {
  return !compliance.publicEnabled || !compliance.regionAllowed;
}
