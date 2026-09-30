import {
  ADSENSE_DIMENSIONS,
  ADSENSE_METRICS,
  adSenseMetricKind,
  adUnitOptionLabel,
  formatAdSenseCell,
  formatAdSenseCount,
  formatAdSenseCurrency,
  groupAdUnitsBySuggestedSize,
  isGamblingPolicyIssue,
  parseAdSenseNumber,
  policyActionLabel,
  validateAdSenseDateRange,
  type AdSenseAdUnit,
} from '../services/adsense';

const get = jest.fn();
const put = jest.fn();

jest.mock('../services/api/client', () => ({
  apiGet: (...args: unknown[]) => get(...args),
  apiPut: (...args: unknown[]) => put(...args),
  ApiError: class ApiError extends Error {},
}));

import * as adsense from '../services/adsense';

function unit(overrides: Partial<AdSenseAdUnit> = {}): AdSenseAdUnit {
  return {
    slotId: '1234567890',
    displayName: 'Home — leaderboard',
    state: 'ACTIVE',
    size: '728x90',
    type: 'DISPLAY',
    suggestedSize: 'leaderboard',
    resourceName: 'accounts/pub-1/adclients/ca-pub-1/adunits/1234567890',
    reportingDimensionId: 'ca-pub-1:1234567890',
    ...overrides,
  };
}

beforeEach(() => {
  get.mockReset();
});

describe('the report request', () => {
  it('joins the allowlists into comma-separated params', () => {
    // `buildQuery` emits one value per key and the DTO's `toList` splits on commas,
    // so joining is the supported way to send a list.
    adsense.fetchAdSenseReport({
      dateRange: 'LAST_7_DAYS',
      dimensions: ['DATE', 'COUNTRY_CODE'],
      metrics: ['CLICKS', 'IMPRESSIONS'],
      limit: 500,
    });

    const [, params] = get.mock.calls[0];
    expect(params).toMatchObject({
      dateRange: 'LAST_7_DAYS',
      dimensions: 'DATE,COUNTRY_CODE',
      metrics: 'CLICKS,IMPRESSIONS',
      limit: 500,
    });
  });

  it('omits empty lists rather than sending a blank param', () => {
    adsense.fetchAdSenseReport({ dimensions: [], metrics: [] });
    const [, params] = get.mock.calls[0];
    expect(params.dimensions).toBeUndefined();
    expect(params.metrics).toBeUndefined();
  });

  it('calls the documented paths', () => {
    adsense.fetchAdSenseStatus();
    adsense.fetchAdSenseAdUnits(true);
    adsense.fetchAdSensePolicyIssues();
    adsense.fetchAdSenseReport();
    expect(get.mock.calls.map((call) => call[0])).toEqual([
      '/admin/adsense/status',
      '/admin/adsense/ad-units',
      '/admin/adsense/policy-issues',
      '/admin/adsense/reports',
    ]);
    expect(get.mock.calls[1][1]).toMatchObject({ includeArchived: true });
  });
});

describe('parsing the allowlists', () => {
  it('exposes exactly the dimensions the API accepts', () => {
    // An unlisted dimension is a 400, not a silent drop, so the pickers must be
    // built from this list.
    expect([...ADSENSE_DIMENSIONS]).toEqual([
      'DATE',
      'AD_UNIT_ID',
      'AD_CLIENT_ID',
      'DOMAIN_NAME',
      'URL',
      'COUNTRY_CODE',
      'DEVICE_TYPE_SIZE',
    ]);
  });

  it('exposes exactly the metrics the API accepts', () => {
    expect(ADSENSE_METRICS).toHaveLength(15);
    expect(ADSENSE_METRICS).toContain('ESTIMATED_EARNINGS');
    expect(ADSENSE_METRICS).toContain('AD_REQUESTS_BLOCKED');
    expect(ADSENSE_METRICS).toContain('COST_PER_THOUSAND_IMPRESSIONS');
  });
});

describe('every cell is a string', () => {
  it('parses numbers, and treats a blank cell as absent rather than zero', () => {
    expect(parseAdSenseNumber('1.42')).toBe(1.42);
    expect(parseAdSenseNumber('')).toBeNull();
    expect(parseAdSenseNumber(null)).toBeNull();
    expect(parseAdSenseNumber('not-a-number')).toBeNull();
  });

  it('does not string-sort a numeric column', () => {
    // '9' > '10' as strings, which is the bug this guards.
    const values = ['9', '10', '100'];
    expect([...values].sort((a, b) => (parseAdSenseNumber(a) ?? 0) - (parseAdSenseNumber(b) ?? 0))).toEqual([
      '9',
      '10',
      '100',
    ]);
  });

  it('formats currency with the requested code and falls back gracefully', () => {
    expect(formatAdSenseCurrency(1.42, 'USD')).toMatch(/1\.42/);
    expect(formatAdSenseCurrency(null, 'USD')).toBe('—');
    expect(formatAdSenseCurrency(2, 'NOT-A-CURRENCY')).toContain('2.00');
  });

  it('formats counts with thousands separators', () => {
    expect(formatAdSenseCount('1234')).toBe('1,234');
    expect(formatAdSenseCount('')).toBe('—');
  });

  it('classifies each column so the table formats it the right way', () => {
    expect(adSenseMetricKind('ESTIMATED_EARNINGS')).toBe('currency');
    expect(adSenseMetricKind('IMPRESSIONS')).toBe('number');
    expect(adSenseMetricKind('IMPRESSIONS_RPM')).toBe('rpm');
    expect(adSenseMetricKind('AD_REQUEST_TARGETING')).toBe('text');
    expect(adSenseMetricKind('DATE')).toBe('number');
  });

  it('formats a dimension cell verbatim rather than as a number', () => {
    expect(formatAdSenseCell('AD_REQUEST_TARGETING', '14')).toBe('14');
    expect(formatAdSenseCell('IMPRESSIONS', '14')).toBe('14');
    expect(formatAdSenseCell('ESTIMATED_EARNINGS', '1.5')).toMatch(/1\.50/);
  });
});

describe('custom date range validation', () => {
  it('accepts a valid inclusive range', () => {
    expect(validateAdSenseDateRange('2026-08-01', '2026-08-31')).toBeNull();
  });

  it('rejects an inverted range, which the API turns into a 400', () => {
    expect(validateAdSenseDateRange('2026-08-31', '2026-08-01')).toMatch(/after/i);
  });

  it('rejects a malformed date', () => {
    expect(validateAdSenseDateRange('01/08/2026', '2026-08-31')).toBeTruthy();
  });

  it('rejects a range over the 400 day cap but allows exactly 400', () => {
    expect(validateAdSenseDateRange('2025-01-01', '2026-08-01')).toMatch(/400/);
    expect(validateAdSenseDateRange('2025-08-31', '2026-08-01')).toBeNull();
  });
});

describe('surfacing the backend error', () => {
  // The backend distinguishes "no credentials configured" from "Google rejected them",
  // and the fix is different for each, so its wording must survive to the screen
  // instead of being replaced by a generic message.
  it('prefers the server message over a generic fallback', () => {
    expect(
      adsense.adSenseErrorMessage(
        { body: { message: 'AdSense rejected the credentials. Check that the service account has been granted API access to the AdSense account.' } },
        'Could not load the earnings report.',
      ),
    ).toMatch(/rejected the credentials/);
  });

  it('joins an array of validation messages', () => {
    expect(adsense.adSenseErrorMessage({ body: { message: ['a must be set', 'b must be set'] } }, 'x')).toBe(
      'a must be set b must be set',
    );
  });

  it('falls back through the error and then the default', () => {
    expect(adsense.adSenseErrorMessage(new Error('network down'), 'x')).toBe('network down');
    expect(adsense.adSenseErrorMessage(null, 'x')).toBe('x');
    expect(adsense.adSenseErrorMessage({ body: {} }, 'x')).toBe('x');
  });

  it('spots a rejected credential, which configured:true does not reveal', () => {
    // `status.configured` is a local env check only, so it reads true even when
    // Google refuses the credentials.
    expect(
      adsense.adsenseCredentialsRejected('AdSense rejected the credentials. Check that…'),
    ).toBe(true);
    expect(adsense.adsenseCredentialsRejected('AdSense Management API is not configured (set…)')).toBe(false);
  });
});

describe('grouping the ad unit dropdown', () => {
  it('groups by suggested size and keeps an other bucket', () => {
    const groups = groupAdUnitsBySuggestedSize([
      unit({ slotId: '1', displayName: 'A', suggestedSize: 'leaderboard' }),
      unit({ slotId: '2', displayName: 'B', suggestedSize: 'medium-rectangle' }),
      unit({ slotId: '3', displayName: 'C', suggestedSize: null }),
    ]);

    expect(groups.map((group) => group.suggestedSize)).toEqual(['leaderboard', 'medium-rectangle', 'other']);
    expect(groups[2].label).toMatch(/no size suggestion/i);
    expect(groups[0].label).toMatch(/leaderboard/i);
  });

  it('returns nothing for an empty list', () => {
    expect(groupAdUnitsBySuggestedSize([])).toEqual([]);
  });

  it('marks an archived unit in the label rather than dropping it', () => {
    // Archived units can still serve ads, so they stay selectable.
    expect(adUnitOptionLabel(unit({ state: 'ARCHIVED' }))).toMatch(/archived/);
    expect(adUnitOptionLabel(unit({ state: 'ACTIVE' }))).not.toMatch(/archived/);
  });
});

describe('policy issue presentation', () => {
  it('recognises a gambling-policy hit for its own badge', () => {
    expect(
      isGamblingPolicyIssue({
        resourceName: '',
        entityType: 'SITE',
        site: 'pakcriczone.com',
        siteSection: null,
        uri: null,
        action: 'WARNED',
        topics: ['gambling'],
        topicTypes: ['POLICY'],
        adRequestCount: 0,
        firstDetectedDate: null,
        lastDetectedDate: null,
        warningEscalationDate: null,
      }),
    ).toBe(true);
  });

  it('does not mislabel an unrelated issue', () => {
    expect(
      isGamblingPolicyIssue({
        resourceName: '',
        entityType: 'SITE',
        site: 'pakcriczone.com',
        siteSection: null,
        uri: null,
        action: 'WARNED',
        topics: ['misleading'],
        topicTypes: ['POLICY'],
        adRequestCount: 0,
        firstDetectedDate: null,
        lastDetectedDate: null,
        warningEscalationDate: null,
      }),
    ).toBe(false);
  });

  it('labels each action in plain language', () => {
    expect(policyActionLabel('AD_SERVING_DISABLED')).toMatch(/disabled/i);
    expect(policyActionLabel('WARNED')).toMatch(/warned/i);
  });
});