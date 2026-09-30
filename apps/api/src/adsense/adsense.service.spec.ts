import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  AdSenseService,
  lastResourceSegment,
  parseIsoDate,
  toAdClientSegment,
  toBareUnitId,
  type AdSenseReportOptions,
} from './adsense.service.js';
import type { SiteSettingsService } from '../site-settings/site-settings.service.js';

type Stub = { path: string; query?: RegExp; body: unknown };

const PUB1 = 'pub-1234567890123456';
const PUB2 = 'pub-1234567890123457';

const P = {
  accounts: '/v2/accounts',
  adClients: (account: string): string => `/v2/accounts/${account}/adclients`,
  adUnits: (account: string, client: string): string => `/v2/accounts/${account}/adclients/${client}/adunits`,
  policyIssues: (account: string): string => `/v2/accounts/${account}/policyIssues`,
  reports: (account: string): string => `/v2/accounts/${account}/reports:generate`,
};

const configStub = (values: Record<string, string>): ConfigService =>
  ({ get: (key: string) => values[key] }) as unknown as ConfigService;

const siteSettingsStub = (clientId: string | null): SiteSettingsService =>
  ({
    getPublic: async () => ({ ads: { clientId } }),
  }) as unknown as SiteSettingsService;

const reportOptions = (overrides: Partial<AdSenseReportOptions> = {}): AdSenseReportOptions => ({
  dateRange: 'CUSTOM',
  startDate: null,
  endDate: null,
  dimensions: ['DATE'],
  metrics: ['ESTIMATED_EARNINGS'],
  adUnitId: null,
  limit: 1000,
  timeZone: null,
  currencyCode: null,
  ...overrides,
});

describe('adsense/resource ids', () => {
  describe('lastResourceSegment', () => {
    it('reads the trailing id from a resource path', () => {
      expect(lastResourceSegment('accounts/pub-1/adclients/ca-pub-2/adunits/1234567890')).toBe('1234567890');
      expect(lastResourceSegment('accounts/pub-1')).toBe('pub-1');
    });

    it('returns null for anything empty or non-string', () => {
      expect(lastResourceSegment('')).toBeNull();
      expect(lastResourceSegment(undefined)).toBeNull();
      expect(lastResourceSegment(7)).toBeNull();
    });
  });

  describe('toAdClientSegment', () => {
    it('normalises the stored publisher id to the ca- resource form', () => {
      expect(toAdClientSegment('pub-1234567890123456')).toBe('ca-pub-1234567890123456');
      expect(toAdClientSegment('ca-pub-1234567890123456')).toBe('ca-pub-1234567890123456');
      expect(toAdClientSegment(' CA-PUB-1234567890123456 ')).toBe('ca-pub-1234567890123456');
    });

    it('rejects values that are not publisher ids', () => {
      expect(toAdClientSegment('pub-abc')).toBeNull();
      expect(toAdClientSegment('ca-pub-123')).toBeNull();
      expect(toAdClientSegment(null)).toBeNull();
    });
  });

  describe('toBareUnitId', () => {
    it('accepts a data-ad-slot value, a reporting id and a resource path', () => {
      expect(toBareUnitId('1234567890')).toBe('1234567890');
      expect(toBareUnitId('ca-pub-123456789:9876543210')).toBe('9876543210');
      expect(toBareUnitId('accounts/pub-1/adclients/ca-pub-2/adunits/1234567890')).toBe('1234567890');
    });

    it('rejects malformed ids so they can never reach a saved slotId', () => {
      expect(toBareUnitId('123')).toBeNull();
      expect(toBareUnitId('123456789012345678901234')).toBeNull();
      expect(toBareUnitId('abc')).toBeNull();
      expect(toBareUnitId(undefined)).toBeNull();
    });
  });

  describe('parseIsoDate', () => {
    it('parses a YYYY-MM-DD date', () => {
      expect(parseIsoDate('2026-08-01')).toEqual({ year: 2026, month: 8, day: 1 });
    });

    it('rejects other formats and out-of-range components', () => {
      expect(() => parseIsoDate('01/08/2026')).toThrow();
      expect(() => parseIsoDate('2026-13-01')).toThrow();
      expect(() => parseIsoDate('2026-08-99')).toThrow();
    });
  });
});

describe('adsense/AdSenseService', () => {
  const urls: string[] = [];
  let stubs: Stub[] = [];
  let fetchMock: jest.SpiedFunction<typeof fetch>;

  const service = (overrides: Record<string, string> = {}, clientId: string | null = null): AdSenseService =>
    new AdSenseService(
      configStub({ ADSENSE_ACCESS_TOKEN: 'test-token', ...overrides }),
      siteSettingsStub(clientId),
    );

  beforeEach(() => {
    urls.length = 0;
    stubs = [];
    fetchMock = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      urls.push(url);
      const parsed = new URL(url);
      const stub = stubs.find(
        (candidate) =>
          parsed.pathname === candidate.path && (!candidate.query || candidate.query.test(parsed.search)),
      );
      if (!stub) throw new Error(`Unexpected AdSense request: ${url}`);
      return {
        ok: true,
        status: 200,
        json: async () => stub.body,
        text: async () => JSON.stringify(stub.body),
      } as unknown as Response;
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('configuration', () => {
    it('is unconfigured without credentials and says so when called', async () => {
      const adsense = service({ ADSENSE_ACCESS_TOKEN: '' });
      expect(adsense.isConfigured).toBe(false);
      expect(adsense.getStatus()).toEqual({
        configured: false,
        authMode: 'none',
        accountId: null,
        adClientId: null,
        publisherId: null,
      });
      await expect(adsense.listAdUnits()).rejects.toBeInstanceOf(ServiceUnavailableException);
      expect(urls).toHaveLength(0);
    });

    it('reports the pinned account and ad client without an upstream call', () => {
      const status = service({ ADSENSE_ACCOUNT_ID: PUB1, ADSENSE_AD_CLIENT_ID: PUB2 }).getStatus();
      expect(status).toEqual({
        configured: true,
        authMode: 'access-token',
        accountId: PUB1,
        adClientId: 'ca-pub-1234567890123457',
        publisherId: PUB2,
      });
      expect(urls).toHaveLength(0);
    });

    it('falls back to unconfigured when the service account JSON is unusable', () => {
      const noToken = { ADSENSE_ACCESS_TOKEN: '' };
      expect(service({ ...noToken, ADSENSE_SERVICE_ACCOUNT_JSON: '{not json' }).isConfigured).toBe(false);
      expect(service({ ...noToken, ADSENSE_SERVICE_ACCOUNT_JSON: '{"client_email":"a@b.com"}' }).isConfigured).toBe(false);
    });
  });

  describe('listAdUnits', () => {
    const pinned = { ADSENSE_ACCOUNT_ID: PUB1, ADSENSE_AD_CLIENT_ID: 'ca-pub-1234567890123456' };
    const adUnitsPath = P.adUnits(PUB1, 'ca-pub-1234567890123456');

    it('maps units to the bare slotId and keeps the reporting id separate', async () => {
      stubs = [
        {
          path: adUnitsPath,
          body: {
            adUnits: [
              {
                name: `accounts/pub-1234567890123456/adclients/ca-pub-1234567890123456/adunits/1234567890`,
                reportingDimensionId: 'ca-pub-1234567890123456:1234567890',
                displayName: 'Home leaderboard',
                state: 'ACTIVE',
                contentAdsSettings: { size: '728x90', type: 'DISPLAY' },
              },
            ],
          },
        },
      ];

      const result = await service(pinned).listAdUnits();

      expect(new URL(urls[0]!).pathname).toBe(adUnitsPath);
      expect(result.adUnits).toEqual([
        {
          slotId: '1234567890',
          displayName: 'Home leaderboard',
          state: 'ACTIVE',
          size: '728x90',
          type: 'DISPLAY',
          suggestedSize: 'leaderboard',
          resourceName: 'accounts/pub-1234567890123456/adclients/ca-pub-1234567890123456/adunits/1234567890',
          reportingDimensionId: 'ca-pub-1234567890123456:1234567890',
        },
      ]);
      expect(result.skipped).toBe(0);
    });

    it('hides archived units unless asked and counts unusable ones as skipped', async () => {
      stubs = [
        {
          path: adUnitsPath,
          body: {
            adUnits: [
              { name: 'accounts/pub-1234567890123456/adclients/ca-pub-1234567890123456/adunits/1234567890', displayName: 'Live', state: 'ACTIVE' },
              { name: 'accounts/pub-1/adclients/ca-pub-1/adunits/9999999999', displayName: 'Old', state: 'ARCHIVED' },
              { name: 'accounts/pub-1/adclients/ca-pub-1/adunits/12', displayName: 'Broken', state: 'ACTIVE' },
            ],
          },
        },
      ];

      const active = await service(pinned).listAdUnits();
      expect(active.adUnits.map((unit) => unit.slotId)).toEqual(['1234567890']);
      expect(active.skipped).toBe(1);

      const all = await service(pinned).listAdUnits(true);
      expect(all.adUnits.map((unit) => unit.displayName)).toEqual(['Live', 'Old']);
      expect(all.skipped).toBe(1);
    });

    it('follows pagination', async () => {
      stubs = [
        {
          path: adUnitsPath,
          query: /pageToken=nope/,
          body: { adUnits: [{ name: 'a/adunits/2222222222', state: 'ACTIVE' }] },
        },
        {
          path: adUnitsPath,
          body: { adUnits: [{ name: 'a/adunits/1111111111', state: 'ACTIVE' }], nextPageToken: 'nope' },
        },
      ];

      const result = await service(pinned).listAdUnits();
      expect(result.adUnits.map((unit) => unit.slotId)).toEqual(['1111111111', '2222222222']);
    });

    it('caches the unit list across calls', async () => {
      stubs = [{ path: adUnitsPath, body: { adUnits: [] } }];
      const adsense = service(pinned);
      await adsense.listAdUnits();
      await adsense.listAdUnits();
      expect(urls).toHaveLength(1);
    });

    it('surfaces an auth failure as a service-unavailable with guidance', async () => {
      fetchMock.mockImplementation(
        async () => ({ ok: false, status: 403, json: async () => ({}), text: async () => 'forbidden' }) as unknown as Response,
      );
      await expect(service(pinned).listAdUnits()).rejects.toThrow(/granted API access/i);
    });
  });

  describe('listPolicyIssues', () => {
    const pinned = { ADSENSE_ACCOUNT_ID: PUB1, ADSENSE_AD_CLIENT_ID: 'ca-pub-1234567890123456' };

    it('summarises and orders issues by severity', async () => {
      stubs = [
        {
          path: P.policyIssues(PUB1),
          body: {
            policyIssues: [
              {
                name: 'accounts/pub-1/policyIssues/a',
                entityType: 'SITE',
                site: 'cricapp.com',
                action: 'WARNED',
                policyTopics: [{ topic: 'more-info', type: 'POLICY' }],
                adRequestCount: '120',
                firstDetectedDate: { year: 2026, month: 8, day: 1 },
                lastDetectedDate: { year: 2026, month: 8, day: 20 },
                warningEscalationDate: { year: 2026, month: 9, day: 20 },
              },
              {
                name: 'accounts/pub-1/policyIssues/b',
                entityType: 'PAGE',
                site: 'cricapp.com',
                uri: 'cricapp.com/odds',
                action: 'AD_SERVING_DISABLED',
                policyTopics: [{ topic: 'gambling' }],
                adRequestCount: '9999',
                lastDetectedDate: { year: 2026, month: 8, day: 2 },
              },
            ],
          },
        },
      ];

      const result = await service(pinned).listPolicyIssues();

      expect(result.summary).toEqual({ total: 2, disabled: 1, restricted: 0, warned: 1, other: 0 });
      expect(result.policyIssues[0]?.action).toBe('AD_SERVING_DISABLED');
      expect(result.policyIssues[0]?.adRequestCount).toBe(9999);
      expect(result.policyIssues[1]?.warningEscalationDate).toBe('2026-09-20');
      expect(result.policyIssues[1]?.firstDetectedDate).toBe('2026-08-01');
    });

    it('maps an unknown action to the unspecified bucket instead of dropping the issue', async () => {
      stubs = [
        {
          path: P.policyIssues(PUB1),
          body: { policyIssues: [{ name: 'x', site: 'cricapp.com', action: 'SOMETHING_NEW' }] },
        },
      ];
      const result = await service(pinned).listPolicyIssues();
      expect(result.policyIssues[0]?.action).toBe('ENFORCEMENT_ACTION_UNSPECIFIED');
      expect(result.summary.other).toBe(1);
    });
  });

  describe('generateReport', () => {
    const pinned = { ADSENSE_ACCOUNT_ID: PUB1, ADSENSE_AD_CLIENT_ID: 'ca-pub-1234567890123456' };

    it('shapes headers, rows, totals and truncation', async () => {
      stubs = [
        {
          path: P.reports(PUB1),
          body: {
            headers: [
              { name: 'DATE', type: 'DIMENSION' },
              { name: 'ESTIMATED_EARNINGS', type: 'METRIC_RPM' },
            ],
            rows: [{ cells: [{ value: '2026-08-01' }, { value: '1.23' }] }],
            totals: { cells: [{ value: '' }, { value: '1.23' }] },
            totalMatchedRows: '2',
          },
        },
      ];

      const result = await service(pinned).generateReport(reportOptions());

      expect(result.columns).toEqual([
        { name: 'DATE', type: 'DIMENSION' },
        { name: 'ESTIMATED_EARNINGS', type: 'METRIC_RPM' },
      ]);
      expect(result.rows).toEqual([{ DATE: '2026-08-01', ESTIMATED_EARNINGS: '1.23' }]);
      expect(result.totals).toEqual({ DATE: '', ESTIMATED_EARNINGS: '1.23' });
      expect(result.truncated).toBe(true);
    });

    it('sends custom dates and clamps the row limit', async () => {
      stubs = [{ path: P.reports(PUB1), body: { headers: [], rows: [] } }];
      await service(pinned).generateReport(
        reportOptions({
          startDate: { year: 2026, month: 8, day: 1 },
          endDate: { year: 2026, month: 8, day: 31 },
          limit: 99_999,
        }),
      );
      const url = new URL(urls[0]!);
      expect(url.pathname).toBe(P.reports(PUB1));
      expect(url.searchParams.get('dateRange')).toBe('CUSTOM');
      expect(url.searchParams.get('startDate.year')).toBe('2026');
      expect(url.searchParams.get('endDate.day')).toBe('31');
      expect(url.searchParams.get('limit')).toBe('10000');
    });

    it('uses the named date range when no custom dates are given', async () => {
      stubs = [{ path: P.reports(PUB1), body: { headers: [], rows: [] } }];
      await service(pinned).generateReport(reportOptions({ dateRange: 'LAST_7_DAYS' }));
      expect(new URL(urls[0]!).searchParams.get('dateRange')).toBe('LAST_7_DAYS');
    });

    it('builds the ad unit filter from the resolved ad client', async () => {
      stubs = [{ path: P.reports(PUB1), body: { headers: [], rows: [] } }];
      await service(pinned).generateReport(reportOptions({ adUnitId: '1234567890' }));
      expect(new URL(urls[0]!).searchParams.get('filters')).toBe("AD_UNIT_ID=='ca-pub-1234567890123456:1234567890'");
    });

    it('keeps the publisher id from a full reporting id', async () => {
      stubs = [{ path: P.reports(PUB1), body: { headers: [], rows: [] } }];
      await service(pinned).generateReport(reportOptions({ adUnitId: 'ca-pub-1234567890999999:1234567890' }));
      expect(new URL(urls[0]!).searchParams.get('filters')).toBe(
        "AD_UNIT_ID=='ca-pub-1234567890999999:1234567890'",
      );
    });

    it('ignores a malformed ad unit id rather than sending a broken filter', async () => {
      stubs = [{ path: P.reports(PUB1), body: { headers: [], rows: [] } }];
      await service(pinned).generateReport(reportOptions({ adUnitId: 'nonsense' }));
      expect(new URL(urls[0]!).searchParams.get('filters')).toBeNull();
    });

    it('rejects an inverted or oversized range', async () => {
      const adsense = service(pinned);
      await expect(
        adsense.generateReport(
          reportOptions({ startDate: { year: 2026, month: 8, day: 31 }, endDate: { year: 2026, month: 8, day: 1 } }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        adsense.generateReport(
          reportOptions({ startDate: { year: 2024, month: 1, day: 1 }, endDate: { year: 2026, month: 8, day: 1 } }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('account resolution', () => {
    it('picks the ad client matching the configured publisher id', async () => {
      stubs = [
        { path: P.adClients(PUB1), body: { adClients: [{ name: `accounts/${PUB1}/adclients/ca-pub-1234567890111111` }] } },
        { path: P.adUnits(PUB1, 'ca-pub-1234567890111111'), body: { adUnits: [] } },
      ];
      await service({ ADSENSE_ACCOUNT_ID: PUB1 }, 'pub-1234567890111111').listAdUnits();
      expect(urls.map((url) => new URL(url).pathname)).toEqual([
        P.adClients(PUB1),
        P.adUnits(PUB1, 'ca-pub-1234567890111111'),
      ]);
    });

    it('falls back to the first content ad client when no publisher id is stored', async () => {
      stubs = [
        { path: P.adClients(PUB1), body: { adClients: [{ name: `accounts/${PUB1}/adclients/ca-pub-1234567890222222` }] } },
        { path: P.adUnits(PUB1, 'ca-pub-1234567890222222'), body: { adUnits: [] } },
      ];
      await service({ ADSENSE_ACCOUNT_ID: PUB1 }, null).listAdUnits();
      expect(urls.map((url) => new URL(url).pathname)).toEqual([
        P.adClients(PUB1),
        P.adUnits(PUB1, 'ca-pub-1234567890222222'),
      ]);
    });

    it('discovers the account when none is pinned', async () => {
      const pub9 = 'pub-1234567890999999';
      stubs = [
        { path: P.accounts, body: { accounts: [{ name: `accounts/${pub9}` }] } },
        { path: P.adClients(pub9), body: { adClients: [{ name: `accounts/${pub9}/adclients/ca-pub-1234567890999999` }] } },
        { path: P.adUnits(pub9, 'ca-pub-1234567890999999'), body: { adUnits: [] } },
      ];
      await service().listAdUnits();
      expect(urls.map((url) => new URL(url).pathname)).toEqual([
        P.accounts,
        P.adClients(pub9),
        P.adUnits(pub9, 'ca-pub-1234567890999999'),
      ]);
    });
  });
});
