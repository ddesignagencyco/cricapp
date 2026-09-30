import { Transform, Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ADSENSE_DATE_RANGES,
  ADSENSE_DIMENSIONS,
  ADSENSE_METRICS,
} from '../adsense.types.js';

const MAX_ROWS = 10_000;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Accepts `A,B` and repeated params alike, since both reach us as one string. */
const toList = ({ value }: { value: unknown }): string[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const raw = Array.isArray(value) ? value : [value];
  const items = raw
    .flatMap((entry) => String(entry).split(','))
    .map((entry) => entry.trim().toUpperCase())
    .filter(Boolean);
  return items.length ? items : undefined;
};

const toBoolean = ({ value }: { value: unknown }): boolean | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  return value === true || value === 'true' || value === '1' || value === 1;
};

export class AdSenseAdUnitsQuery {
  @ApiPropertyOptional({
    description:
      'Include archived ad units. Archived units are hidden by default but can still serve ads.',
  })
  @IsOptional()
  @Transform(toBoolean)
  includeArchived?: boolean;
}

export class AdSenseReportQuery {
  @ApiPropertyOptional({ enum: ADSENSE_DATE_RANGES, default: 'LAST_30_DAYS' })
  @IsOptional()
  @IsIn(ADSENSE_DATE_RANGES)
  dateRange: (typeof ADSENSE_DATE_RANGES)[number] = 'LAST_30_DAYS';

  @ApiPropertyOptional({ description: 'Inclusive start date (YYYY-MM-DD). Requires endDate.', example: '2026-08-01' })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE_RE, { message: 'startDate must be a YYYY-MM-DD date' })
  startDate?: string;

  @ApiPropertyOptional({ description: 'Inclusive end date (YYYY-MM-DD). Requires startDate.', example: '2026-08-31' })
  @IsOptional()
  @IsString()
  @Matches(ISO_DATE_RE, { message: 'endDate must be a YYYY-MM-DD date' })
  endDate?: string;

  @ApiPropertyOptional({ enum: ADSENSE_DIMENSIONS, isArray: true, default: ['DATE'] })
  @IsOptional()
  @Transform(toList)
  @IsIn(ADSENSE_DIMENSIONS, { each: true })
  dimensions?: string[];

  @ApiPropertyOptional({
    enum: ADSENSE_METRICS,
    isArray: true,
    default: ['ESTIMATED_EARNINGS', 'PAGE_VIEWS', 'IMPRESSIONS', 'IMPRESSIONS_RPM'],
  })
  @IsOptional()
  @Transform(toList)
  @IsIn(ADSENSE_METRICS, { each: true })
  metrics?: string[];

  @ApiPropertyOptional({
    description: 'Restrict to one ad unit, as a bare `data-ad-slot` id or a `ca-pub-…:…` reporting id.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  adUnitId?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: MAX_ROWS, default: 1000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_ROWS)
  limit = 1000;

  @ApiPropertyOptional({ description: 'IANA time zone, e.g. Asia/Karachi. Defaults to the account time zone.' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timeZone?: string;

  @ApiPropertyOptional({ description: 'ISO-4217 currency code. Defaults to the account currency.' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currencyCode?: string;
}
