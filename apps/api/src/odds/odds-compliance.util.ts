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

export function buildOddsCompliance(cfg: ConfigService): OddsComplianceEnvelope {
  const publicEnabled = cfg.get<string>('ODDS_PUBLIC_ENABLED', 'false') === 'true';
  const allowedRegions = cfg.get<string>('ODDS_ALLOWED_REGIONS', '*').trim();
  const requestRegion = cfg.get<string>('ODDS_REQUEST_REGION', '').trim();
  const regionAllowed =
    allowedRegions === '*' ||
    allowedRegions === '' ||
    (requestRegion !== '' &&
      allowedRegions
        .split(',')
        .map((r) => r.trim().toUpperCase())
        .includes(requestRegion.toUpperCase()));

  return {
    publicEnabled,
    regionAllowed,
    ageGatingRequired: cfg.get<string>('ODDS_AGE_GATING_REQUIRED', 'true') === 'true',
    advertisingRestricted: cfg.get<string>('ODDS_ADVERTISING_RESTRICTED', 'true') === 'true',
    responsibleUseMessage: cfg.get<string>('ODDS_RESPONSIBLE_USE_MESSAGE', DEFAULT_MESSAGE),
    disclaimer: cfg.get<string>('ODDS_PRICE_DISCLAIMER', DEFAULT_DISCLAIMER),
  };
}

export function oddsAccessBlocked(compliance: OddsComplianceEnvelope): boolean {
  return !compliance.publicEnabled || !compliance.regionAllowed;
}
