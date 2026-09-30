import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { AdSize } from '../site-settings/ad.config.js';

/**
 * Whitelists for `reports:generate`. The API accepts any enum member, but a
 * dashboard only needs a small set and an unbounded pass-through would let a
 * caller burn report quota on dimensions we never render.
 */
export const ADSENSE_DIMENSIONS = [
  'DATE',
  'AD_UNIT_ID',
  'AD_CLIENT_ID',
  'DOMAIN_NAME',
  'URL',
  'COUNTRY_CODE',
  'DEVICE_TYPE_SIZE',
] as const;
export type AdSenseDimension = (typeof ADSENSE_DIMENSIONS)[number];

export const ADSENSE_METRICS = [
  'ESTIMATED_EARNINGS',
  'ESTIMATED_PAGE_VIEWS',
  'PAGE_VIEWS',
  'IMPRESSIONS',
  'IMPRESSIONS_RPM',
  'PAGE_VIEWS_RPM',
  'CLICKS',
  'AD_REQUESTS',
  'AD_REQUESTS_SHOWN',
  'AD_REQUESTS_BLOCKED',
  'MATCHED_AD_REQUESTS',
  'AD_REQUESTS_RPM',
  'AD_REQUEST_TARGETING',
  'COST_PER_CLICK',
  'COST_PER_THOUSAND_IMPRESSIONS',
] as const;
export type AdSenseMetric = (typeof ADSENSE_METRICS)[number];

export const ADSENSE_DATE_RANGES = [
  'CUSTOM',
  'TODAY',
  'YESTERDAY',
  'LAST_7_DAYS',
  'LAST_14_DAYS',
  'LAST_30_DAYS',
  'THIS_MONTH',
  'LAST_MONTH',
  'LAST_3_MONTHS',
  'LAST_6_MONTHS',
] as const;
export type AdSenseDateRange = (typeof ADSENSE_DATE_RANGES)[number];

export type AdSenseAdUnitState = 'ACTIVE' | 'ARCHIVED' | 'STATE_UNSPECIFIED';

export type AdSensePolicyAction =
  | 'WARNED'
  | 'AD_SERVING_RESTRICTED'
  | 'AD_SERVING_DISABLED'
  | 'AD_SERVED_WITH_CLICK_CONFIRMATION'
  | 'AD_PERSONALIZATION_RESTRICTED'
  | 'ENFORCEMENT_ACTION_UNSPECIFIED';

export class AdSenseAdUnitDto {
  @ApiProperty({
    nullable: true,
    description: 'Bare numeric id for the `data-ad-slot` attribute, as accepted by the site settings `slotId`.',
  })
  slotId: string | null;

  @ApiProperty({ description: 'Name shown in the AdSense dashboard.' })
  displayName: string;

  @ApiProperty({ enum: ['ACTIVE', 'ARCHIVED', 'STATE_UNSPECIFIED'] })
  state: AdSenseAdUnitState;

  @ApiProperty({ nullable: true, description: 'Raw AdSense size, e.g. `728x90`, or `1x3` for responsive units.' })
  size: string | null;

  @ApiProperty({ nullable: true, example: 'DISPLAY' })
  type: string | null;

  @ApiProperty({
    nullable: true,
    enum: ['leaderboard', 'tablet-banner', 'mobile-banner', 'medium-rectangle', 'large-rectangle', 'half-page'],
    description: 'Placement size this unit most likely fits, for grouping the dropdown. Null when ambiguous.',
  })
  suggestedSize: AdSize | null;

  @ApiProperty({ description: 'AdSense resource name for the unit.' })
  resourceName: string;

  @ApiProperty({
    nullable: true,
    description: 'The `ca-pub-…:…` reporting id. Used for report filters, never as a `slotId`.',
  })
  reportingDimensionId: string | null;
}

export class AdSenseAdUnitsResponseDto {
  @ApiProperty({ type: [AdSenseAdUnitDto] })
  adUnits: AdSenseAdUnitDto[];

  @ApiProperty({ description: 'Units AdSense returned with no usable numeric id, which were dropped.' })
  skipped: number;
}

export class AdSensePolicyIssueDto {
  @ApiProperty()
  resourceName: string;

  @ApiProperty({ example: 'SITE' })
  entityType: string;

  @ApiProperty({ example: 'cricapp.com' })
  site: string;

  @ApiProperty({ nullable: true })
  siteSection: string | null;

  @ApiProperty({ nullable: true, description: 'Present when the issue applies to a single page.' })
  uri: string | null;

  @ApiProperty({
    enum: [
      'WARNED',
      'AD_SERVING_RESTRICTED',
      'AD_SERVING_DISABLED',
      'AD_SERVED_WITH_CLICK_CONFIRMATION',
      'AD_PERSONALIZATION_RESTRICTED',
      'ENFORCEMENT_ACTION_UNSPECIFIED',
    ],
  })
  action: AdSensePolicyAction;

  @ApiProperty({ type: [String], example: ['gambling'] })
  topics: string[];

  @ApiProperty({ type: [String], example: ['POLICY'] })
  topicTypes: string[];

  @ApiProperty({ description: 'Ad requests affected by the violation over the past seven days.' })
  adRequestCount: number;

  @ApiProperty({ nullable: true, example: '2026-08-01' })
  firstDetectedDate: string | null;

  @ApiProperty({ nullable: true, example: '2026-08-20' })
  lastDetectedDate: string | null;

  @ApiProperty({
    nullable: true,
    example: '2026-09-20',
    description: 'When `WARNED`, the date enforcement begins unless the issue is resolved.',
  })
  warningEscalationDate: string | null;
}

export class AdSensePolicyIssueSummaryDto {
  @ApiProperty()
  total: number;

  @ApiProperty()
  disabled: number;

  @ApiProperty()
  restricted: number;

  @ApiProperty()
  warned: number;

  @ApiProperty()
  other: number;
}

export class AdSensePolicyIssuesResponseDto {
  @ApiProperty({ type: [AdSensePolicyIssueDto], description: 'Ordered most severe first.' })
  policyIssues: AdSensePolicyIssueDto[];

  @ApiProperty({ type: AdSensePolicyIssueSummaryDto })
  summary: AdSensePolicyIssueSummaryDto;
}

export class AdSenseReportColumnDto {
  @ApiProperty({ example: 'DATE' })
  name: string;

  @ApiProperty({ example: 'DIMENSION' })
  type: string;
}

export class AdSenseReportResponseDto {
  @ApiProperty({ nullable: true, example: '2026-08-01', description: 'Null when a named date range was used.' })
  startDate: string | null;

  @ApiProperty({ nullable: true, example: '2026-08-31' })
  endDate: string | null;

  @ApiProperty({ type: [String], enum: ADSENSE_DIMENSIONS })
  dimensions: AdSenseDimension[];

  @ApiProperty({ type: [String], enum: ADSENSE_METRICS })
  metrics: AdSenseMetric[];

  @ApiProperty({ type: [AdSenseReportColumnDto] })
  columns: AdSenseReportColumnDto[];

  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    description: 'One entry per row, keyed by column name.',
  })
  rows: Record<string, string>[];

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'string' },
    nullable: true,
    description: 'Row totals, keyed by column name, when AdSense returned them.',
  })
  totals: Record<string, string> | null;

  @ApiProperty({ nullable: true, description: 'Rows matched before the limit was applied.' })
  totalMatchedRows: number | null;

  @ApiProperty({ description: 'True when the result set was cut short by the row limit.' })
  truncated: boolean;
}

export class AdSenseStatusDto {
  @ApiProperty({ description: 'False when no AdSense credentials are set on the API service.' })
  configured: boolean;

  @ApiProperty({ enum: ['service-account', 'access-token', 'none'] })
  authMode: 'service-account' | 'access-token' | 'none';

  @ApiProperty({ nullable: true, description: 'From ADSENSE_ACCOUNT_ID, when pinned. Otherwise discovered per call.' })
  accountId: string | null;

  @ApiProperty({ nullable: true, description: 'From ADSENSE_AD_CLIENT_ID, when pinned.' })
  adClientId: string | null;

  @ApiProperty({ nullable: true })
  publisherId: string | null;
}

export type AdSenseServiceAccount = {
  clientEmail: string;
  privateKey: string;
};

type GoogleDate = { year?: number; month?: number; day?: number };

export type GoogleAdUnit = {
  name?: string;
  reportingDimensionId?: string;
  displayName?: string;
  state?: string;
  contentAdsSettings?: { size?: string; type?: string };
};

export type GooglePolicyTopic = { topic?: string; type?: string };

export type GooglePolicyIssue = {
  name?: string;
  entityType?: string;
  site?: string;
  siteSection?: string;
  uri?: string;
  policyTopics?: GooglePolicyTopic[];
  adRequestCount?: string;
  action?: string;
  firstDetectedDate?: GoogleDate;
  lastDetectedDate?: GoogleDate;
  warningEscalationDate?: GoogleDate;
};

export type GoogleReportCell = { value?: string };
export type GoogleReportRow = { cells?: GoogleReportCell[] };
export type GoogleReportHeader = { name?: string; type?: string };

export type GoogleReportResult = {
  headers?: GoogleReportHeader[];
  rows?: GoogleReportRow[];
  totals?: GoogleReportRow;
  totalMatchedRows?: string;
};
