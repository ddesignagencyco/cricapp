import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { BadRequestException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { isValidAdUnitId, suggestAdSizeForDimensions } from '../site-settings/ad.config.js';
import { SiteSettingsService } from '../site-settings/site-settings.service.js';
import {
  type AdSenseAdUnitDto,
  type AdSenseAdUnitState,
  type AdSenseAdUnitsResponseDto,
  type AdSenseDateRange,
  type AdSenseDimension,
  type AdSenseMetric,
  type AdSensePolicyAction,
  type AdSensePolicyIssueDto,
  type AdSensePolicyIssuesResponseDto,
  type AdSenseReportResponseDto,
  type AdSenseServiceAccount,
  type AdSenseStatusDto,
  type GoogleAdUnit,
  type GooglePolicyIssue,
  type GoogleReportCell,
  type GoogleReportResult,
} from './adsense.types.js';

const DEFAULT_BASE_URL = 'https://adsense.googleapis.com/v2';
const DEFAULT_SCOPE = 'https://www.googleapis.com/auth/adsense.readonly';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const JWT_BEARER_GRANT = 'urn:ietf:params:oauth:grant-type:jwt-bearer';
const REQUEST_TIMEOUT_MS = 15_000;
const PAGE_SIZE = 1000;
const MAX_PAGES = 20;
const MAX_ROWS = 10_000;
const MAX_RANGE_DAYS = 400;
const TOKEN_EXPIRY_SKEW_MS = 60_000;
const ASSERTION_LIFETIME_SECONDS = 3600;

const CACHE_TTL = {
  account: 60 * 60 * 1000,
  adUnits: 10 * 60 * 1000,
  policyIssues: 5 * 60 * 1000,
  report: 5 * 60 * 1000,
} as const;

export type AdSenseReportOptions = {
  dateRange: AdSenseDateRange;
  startDate: { year: number; month: number; day: number } | null;
  endDate: { year: number; month: number; day: number } | null;
  dimensions: AdSenseDimension[];
  metrics: AdSenseMetric[];
  adUnitId: string | null;
  limit: number;
  timeZone: string | null;
  currencyCode: string | null;
};

type CacheEntry = { promise: Promise<unknown>; expiresAt: number };

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

/** `accounts/pub-1/adclients/ca-pub-2/adunits/1234567890` -> `1234567890`. */
export function lastResourceSegment(name: unknown): string | null {
  const value = asString(name);
  if (!value) return null;
  return value.split('/').filter(Boolean).pop() ?? null;
}

/** Ad clients are addressed as `ca-pub-…` in resource paths but stored as bare
 * `pub-…` publisher ids, so accept either and normalise to the path form.
 */
export function toAdClientSegment(value: unknown): string | null {
  const raw = asString(value)?.trim().toLowerCase() ?? null;
  if (!raw) return null;
  const stripped = raw.replace(/^ca-/, '');
  return /^pub-\d{10,20}$/.test(stripped) ? `ca-${stripped}` : null;
}

/**
 * Extracts the bare numeric unit id from anything the admin UI might send: a
 * `data-ad-slot` value, a full `ca-pub-…:…` reporting id, or a resource path.
 */
export function toBareUnitId(value: unknown): string | null {
  const raw = asString(value);
  if (!raw) return null;
  const candidate = raw.includes(':') ? raw.slice(raw.lastIndexOf(':') + 1) : lastResourceSegment(raw);
  return candidate && isValidAdUnitId(candidate) ? candidate : null;
}

/** Splits `ca-pub-999:123` into its publisher and unit halves, or null if malformed. */
export function splitReportingId(value: unknown): { publisher: string; unitId: string } | null {
  const raw = asString(value);
  if (!raw || !raw.includes(':')) return null;
  const publisher = toAdClientSegment(raw.slice(0, raw.lastIndexOf(':')));
  const unitId = toBareUnitId(raw);
  return publisher && unitId ? { publisher, unitId } : null;
}

function toDateString(date: { year?: number; month?: number; day?: number } | undefined): string | null {
  if (!date || !date.year || !date.month || !date.day) return null;
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}

function toAdUnitState(value: unknown): AdSenseAdUnitState {
  return value === 'ACTIVE' || value === 'ARCHIVED' ? value : 'STATE_UNSPECIFIED';
}

function toPolicyAction(value: unknown): AdSensePolicyAction {
  const known: AdSensePolicyAction[] = [
    'WARNED',
    'AD_SERVING_RESTRICTED',
    'AD_SERVING_DISABLED',
    'AD_SERVED_WITH_CLICK_CONFIRMATION',
    'AD_PERSONALIZATION_RESTRICTED',
  ];
  return known.includes(value as AdSensePolicyAction) ? (value as AdSensePolicyAction) : 'ENFORCEMENT_ACTION_UNSPECIFIED';
}

export function parseIsoDate(value: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) throw new Error('Expected a YYYY-MM-DD date.');
  const [, year, month, day] = match;
  const parsed = { year: Number(year), month: Number(month), day: Number(day) };
  if (parsed.month < 1 || parsed.month > 12 || parsed.day < 1 || parsed.day > 31) {
    throw new Error('Date is out of range.');
  }
  return parsed;
}

function daysBetween(start: { year: number; month: number; day: number }, end: { year: number; month: number; day: number }): number {
  const from = Date.UTC(start.year, start.month - 1, start.day);
  const to = Date.UTC(end.year, end.month - 1, end.day);
  return Math.round((to - from) / 86_400_000);
}

@Injectable()
export class AdSenseService {
  private readonly logger = new Logger(AdSenseService.name);
  private readonly baseUrl: string;
  private readonly scope: string;
  private readonly accountIdOverride: string | null;
  private readonly adClientIdOverride: string | null;
  private readonly serviceAccount: AdSenseServiceAccount | null;
  private readonly staticAccessToken: string | null;
  private readonly cache = new Map<string, CacheEntry>();
  private cachedToken: { value: string; expiresAt: number } | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly siteSettings: SiteSettingsService,
  ) {
    this.baseUrl = (this.config.get<string>('ADSENSE_API_BASE_URL') ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.scope = this.config.get<string>('ADSENSE_SCOPE') ?? DEFAULT_SCOPE;
    this.accountIdOverride = asString(this.config.get<string>('ADSENSE_ACCOUNT_ID'));
    this.adClientIdOverride = toAdClientSegment(this.config.get<string>('ADSENSE_AD_CLIENT_ID'));
    this.serviceAccount = this.readServiceAccount();
    this.staticAccessToken = asString(this.config.get<string>('ADSENSE_ACCESS_TOKEN'));
  }

  get isConfigured(): boolean {
    return this.serviceAccount !== null || this.staticAccessToken !== null;
  }

  getStatus(): AdSenseStatusDto {
    return {
      configured: this.isConfigured,
      authMode: this.serviceAccount ? 'service-account' : this.staticAccessToken ? 'access-token' : 'none',
      accountId: this.accountIdOverride,
      adClientId: this.adClientIdOverride,
      publisherId: this.adClientIdOverride?.replace(/^ca-/, '') ?? null,
    };
  }

  private readServiceAccount(): AdSenseServiceAccount | null {
    const inline = asString(this.config.get<string>('ADSENSE_SERVICE_ACCOUNT_JSON'));
    const file = asString(this.config.get<string>('ADSENSE_SERVICE_ACCOUNT_FILE'));
    let raw = inline;
    if (!raw && file) {
      try {
        raw = readFileSync(file, 'utf8');
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.warn(`ADSENSE_SERVICE_ACCOUNT_FILE could not be read: ${message}`);
        return null;
      }
    }
    if (!raw) return null;

    try {
      const parsed = asRecord(JSON.parse(raw));
      // Firebase-style keys nest the fields under `service_account`.
      const source = asRecord(parsed.service_account ?? {});
      const clientEmail = asString(parsed.client_email) ?? asString(source.client_email);
      const privateKey = asString(parsed.private_key) ?? asString(source.private_key);
      if (!clientEmail || !privateKey) {
        this.logger.warn('AdSense service account is missing client_email or private_key.');
        return null;
      }
      return { clientEmail, privateKey };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`ADSENSE_SERVICE_ACCOUNT_JSON is not valid JSON: ${message}`);
      return null;
    }
  }

  private assertConfigured(): void {
    if (!this.isConfigured) {
      throw new ServiceUnavailableException(
        'AdSense Management API is not configured (set ADSENSE_SERVICE_ACCOUNT_JSON or ADSENSE_SERVICE_ACCOUNT_FILE on the API service).',
      );
    }
  }

  /**
   * In-flight promises are cached rather than resolved values, so concurrent
   * admin requests for the same resource collapse into one upstream call.
   */
  private async cached<T>(key: string, ttl: number, factory: () => Promise<T>): Promise<T> {
    const existing = this.cache.get(key);
    if (existing && existing.expiresAt > Date.now()) return existing.promise as Promise<T>;
    const promise = factory();
    this.cache.set(key, { promise, expiresAt: Date.now() + ttl });
    try {
      return await promise;
    } catch (err) {
      this.cache.delete(key);
      throw err;
    }
  }

  private buildAssertion(): string {
    const sa = this.serviceAccount!;
    const issuedAt = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const claims = Buffer.from(
      JSON.stringify({
        iss: sa.clientEmail,
        scope: this.scope,
        aud: TOKEN_URL,
        iat: issuedAt,
        exp: issuedAt + ASSERTION_LIFETIME_SECONDS,
      }),
    ).toString('base64url');
    const signingInput = `${header}.${claims}`;
    const signer = createSign('RSA-SHA256');
    signer.update(signingInput);
    signer.end();
    return `${signingInput}.${signer.sign(sa.privateKey, 'base64url')}`;
  }

  private async getAccessToken(): Promise<string> {
    if (this.staticAccessToken) return this.staticAccessToken;
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) return this.cachedToken.value;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(TOKEN_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: JWT_BEARER_GRANT, assertion: this.buildAssertion() }),
        signal: controller.signal,
      });
      if (!res.ok) {
        this.logger.warn(`AdSense token request failed with ${res.status}: ${await res.text()}`);
        throw new ServiceUnavailableException('AdSense access token request failed.');
      }
      const body = asRecord(await res.json());
      const accessToken = asString(body.access_token);
      if (!accessToken) throw new ServiceUnavailableException('AdSense access token request failed.');
      const expiresIn = Number(body.expires_in ?? 3600) * 1000;
      this.cachedToken = { value: accessToken, expiresAt: Date.now() + expiresIn - TOKEN_EXPIRY_SKEW_MS };
      return accessToken;
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`AdSense token request error: ${message}`);
      throw new ServiceUnavailableException('AdSense access token request failed.');
    } finally {
      clearTimeout(timer);
    }
  }

  private async fetchJson<T>(path: string, params?: URLSearchParams): Promise<T> {
    this.assertConfigured();
    const query = params?.toString();
    const url = `${this.baseUrl}${path}${query ? `?${query}` : ''}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        headers: { authorization: `Bearer ${await this.getAccessToken()}` },
        signal: controller.signal,
      });
      if (res.status === 401 || res.status === 403) {
        this.logger.warn(`AdSense ${res.status} for ${path}: ${await res.text()}`);
        throw new ServiceUnavailableException(
          'AdSense rejected the credentials. Check that the service account has been granted API access to the AdSense account.',
        );
      }
      if (!res.ok) {
        this.logger.warn(`AdSense ${res.status} for ${path}`);
        throw new ServiceUnavailableException(`AdSense request failed (${res.status}).`);
      }
      return (await res.json()) as T;
    } catch (err) {
      if (err instanceof ServiceUnavailableException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`AdSense fetch failed for ${path}: ${message}`);
      throw new ServiceUnavailableException('AdSense request failed.');
    } finally {
      clearTimeout(timer);
    }
  }

  private async fetchAllPages(path: string, key: string, pick: (page: Record<string, unknown>) => unknown[]): Promise<unknown[]> {
    const items: unknown[] = [];
    let pageToken: string | null = null;
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const params = new URLSearchParams({ pageSize: String(PAGE_SIZE) });
      if (pageToken) params.set('pageToken', pageToken);
      const body = asRecord(await this.fetchJson(path, params));
      items.push(...pick(body));
      pageToken = asString(body.nextPageToken);
      if (!pageToken) break;
    }
    if (pageToken) this.logger.warn(`AdSense ${key} pagination stopped at ${MAX_PAGES} pages.`);
    return items;
  }

  private async resolveAccountId(): Promise<string> {
    if (this.accountIdOverride) return this.accountIdOverride;
    return this.cached('account', CACHE_TTL.account, async () => {
      const body = asRecord(await this.fetchJson('/accounts'));
      const first = Array.isArray(body.accounts) ? asRecord(body.accounts[0]) : null;
      const id = lastResourceSegment(first?.name);
      if (!id) throw new ServiceUnavailableException('No AdSense account is visible to these credentials.');
      return id;
    });
  }

  private async resolveAdClientId(accountId: string): Promise<string> {
    if (this.adClientIdOverride) return this.adClientIdOverride;
    return this.cached(`adClient:${accountId}`, CACHE_TTL.account, async () => {
      const path = `/accounts/${encodeURIComponent(accountId)}/adclients`;
      const clients = await this.fetchAllPages(path, 'adclients', (page) =>
        Array.isArray(page.adClients) ? page.adClients : [],
      );
      if (clients.length === 0) {
        throw new ServiceUnavailableException('No AdSense ad client is visible to these credentials.');
      }
      const segments = clients.map((client) => lastResourceSegment(asRecord(client).name));
      // Prefer the ad client matching the publisher id already stored in site
      // settings, so the dropdown lists units for the account actually in use.
      const { clientId: stored } = (await this.siteSettings.getPublic()).ads;
      const wanted = toAdClientSegment(stored);
      if (wanted && segments.includes(wanted)) return wanted;
      return segments.find((segment) => segment?.startsWith('ca-pub-')) ?? segments[0]!;
    });
  }

  private async adUnitPath(): Promise<string> {
    const accountId = await this.resolveAccountId();
    const adClientId = await this.resolveAdClientId(accountId);
    return `/accounts/${encodeURIComponent(accountId)}/adclients/${encodeURIComponent(adClientId)}/adunits`;
  }

  private toAdUnitDto(raw: GoogleAdUnit): AdSenseAdUnitDto | null {
    const slotId = lastResourceSegment(raw.name);
    if (!slotId || !isValidAdUnitId(slotId)) return null;
    const contentAds = raw.contentAdsSettings ?? {};
    return {
      slotId,
      displayName: asString(raw.displayName) ?? slotId,
      state: toAdUnitState(raw.state),
      size: asString(contentAds.size),
      type: asString(contentAds.type),
      suggestedSize: suggestAdSizeForDimensions(contentAds.size),
      resourceName: asString(raw.name) ?? '',
      reportingDimensionId: asString(raw.reportingDimensionId),
    };
  }

  async listAdUnits(includeArchived = false): Promise<AdSenseAdUnitsResponseDto> {
    return this.cached(`adUnits:${includeArchived}`, CACHE_TTL.adUnits, async () => {
      const path = await this.adUnitPath();
      const raw = (await this.fetchAllPages(path, 'adunits', (page) =>
        Array.isArray(page.adUnits) ? page.adUnits : [],
      )) as GoogleAdUnit[];
      const adUnits: AdSenseAdUnitDto[] = [];
      let skipped = 0;
      for (const unit of raw) {
        const dto = this.toAdUnitDto(unit);
        if (!dto) {
          skipped += 1;
          continue;
        }
        if (!includeArchived && dto.state === 'ARCHIVED') continue;
        adUnits.push(dto);
      }
      adUnits.sort((a, b) => a.displayName.localeCompare(b.displayName));
      return { adUnits, skipped };
    });
  }

  async listPolicyIssues(): Promise<AdSensePolicyIssuesResponseDto> {
    return this.cached('policyIssues', CACHE_TTL.policyIssues, async () => {
      const accountId = await this.resolveAccountId();
      const path = `/accounts/${encodeURIComponent(accountId)}/policyIssues`;
      const raw = (await this.fetchAllPages(path, 'policyIssues', (page) =>
        Array.isArray(page.policyIssues) ? page.policyIssues : [],
      )) as GooglePolicyIssue[];

      const policyIssues: AdSensePolicyIssueDto[] = raw.map((issue) => {
        const topics = Array.isArray(issue.policyTopics) ? issue.policyTopics : [];
        return {
          resourceName: asString(issue.name) ?? '',
          entityType: asString(issue.entityType) ?? 'ENTITY_TYPE_UNSPECIFIED',
          site: asString(issue.site) ?? '',
          siteSection: asString(issue.siteSection),
          uri: asString(issue.uri),
          action: toPolicyAction(issue.action),
          topics: topics.map((topic) => asString(topic.topic)).filter((topic): topic is string => topic !== null),
          topicTypes: topics.map((topic) => asString(topic.type)).filter((type): type is string => type !== null),
          adRequestCount: Number(issue.adRequestCount ?? 0) || 0,
          firstDetectedDate: toDateString(issue.firstDetectedDate),
          lastDetectedDate: toDateString(issue.lastDetectedDate),
          warningEscalationDate: toDateString(issue.warningEscalationDate),
        };
      });

      policyIssues.sort((a, b) => {
        const weight = (issue: AdSensePolicyIssueDto): number =>
          issue.action === 'AD_SERVING_DISABLED' ? 0 : issue.action === 'AD_SERVING_RESTRICTED' ? 1 : 2;
        return weight(a) - weight(b) || (b.lastDetectedDate ?? '').localeCompare(a.lastDetectedDate ?? '');
      });

      const summary = { total: policyIssues.length, disabled: 0, restricted: 0, warned: 0, other: 0 };
      for (const issue of policyIssues) {
        if (issue.action === 'AD_SERVING_DISABLED') summary.disabled += 1;
        else if (issue.action === 'AD_SERVING_RESTRICTED') summary.restricted += 1;
        else if (issue.action === 'WARNED') summary.warned += 1;
        else summary.other += 1;
      }
      return { policyIssues, summary };
    });
  }

  private buildReportParams(options: AdSenseReportOptions, adClientId: string | null): URLSearchParams {
    const params = new URLSearchParams();
    for (const dimension of options.dimensions) params.append('dimensions', dimension);
    for (const metric of options.metrics) params.append('metrics', metric);
    params.set('limit', String(Math.min(options.limit, MAX_ROWS)));
    if (options.timeZone) params.set('reportingTimeZone', options.timeZone);
    if (options.currencyCode) params.set('currencyCode', options.currencyCode);

    // A bare slot id has no publisher half, so it needs the resolved ad client.
    // A full reporting id already carries its own and must keep it.
    const reporting = splitReportingId(options.adUnitId);
    const unitId = reporting?.unitId ?? toBareUnitId(options.adUnitId);
    const client = reporting?.publisher ?? adClientId;
    if (unitId && client) params.set('filters', `AD_UNIT_ID=='${client}:${unitId}'`);

    if (options.startDate && options.endDate) {
      const span = daysBetween(options.startDate, options.endDate);
      if (span < 0) throw new BadRequestException('startDate must not be after endDate.');
      if (span > MAX_RANGE_DAYS) {
        throw new BadRequestException(`Date range is limited to ${MAX_RANGE_DAYS} days.`);
      }
      params.set('dateRange', 'CUSTOM');
      for (const [key, date] of [
        ['startDate', options.startDate],
        ['endDate', options.endDate],
      ] as const) {
        params.set(`${key}.year`, String(date.year));
        params.set(`${key}.month`, String(date.month));
        params.set(`${key}.day`, String(date.day));
      }
    } else {
      params.set('dateRange', options.dateRange);
    }
    return params;
  }

  private toReportDto(result: GoogleReportResult, options: AdSenseReportOptions): AdSenseReportResponseDto {
    const columns = (result.headers ?? [])
      .map((header) => ({ name: asString(header.name) ?? '', type: asString(header.type) ?? 'DIMENSION' }))
      .filter((column) => column.name !== '');

    const cellValue = (cell: GoogleReportCell | undefined): string => asString(cell?.value) ?? '';
    const toRecord = (row: { cells?: GoogleReportCell[] } | undefined): Record<string, string> => {
      const record: Record<string, string> = {};
      columns.forEach((column, index) => {
        record[column.name] = cellValue(row?.cells?.[index]);
      });
      return record;
    };

    const rows = (result.rows ?? []).map((row) => toRecord(row));
    const totalMatchedRows = Number(result.totalMatchedRows ?? rows.length) || null;
    return {
      startDate: options.startDate ? `${options.startDate.year}-${String(options.startDate.month).padStart(2, '0')}-${String(options.startDate.day).padStart(2, '0')}` : null,
      endDate: options.endDate ? `${options.endDate.year}-${String(options.endDate.month).padStart(2, '0')}-${String(options.endDate.day).padStart(2, '0')}` : null,
      dimensions: options.dimensions,
      metrics: options.metrics,
      columns,
      rows,
      totals: result.totals ? toRecord(result.totals) : null,
      totalMatchedRows,
      truncated: totalMatchedRows !== null && totalMatchedRows > rows.length,
    };
  }

  async generateReport(options: AdSenseReportOptions): Promise<AdSenseReportResponseDto> {
    const accountId = await this.resolveAccountId();
    // Only needed to build an ad-unit filter, and this can fail for accounts
    // with no ad client yet, which must not break an unfiltered report.
    const adClientId = options.adUnitId ? await this.resolveAdClientId(accountId).catch(() => null) : null;
    const params = this.buildReportParams(options, adClientId);
    const cacheKey = `report:${accountId}:${params.toString()}`;
    return this.cached(cacheKey, CACHE_TTL.report, async () => {
      const path = `/accounts/${encodeURIComponent(accountId)}/reports:generate`;
      const result = await this.fetchJson<GoogleReportResult>(path, params);
      return this.toReportDto(asRecord(result) as GoogleReportResult, options);
    });
  }
}
