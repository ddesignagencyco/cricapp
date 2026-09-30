import {
  adsFormFromConfig,
  placementRowsFor,
  toAdConfigInput,
  validateAdsForm,
} from '../components/admin/AdConfigPanel';
import { AD_PLACEMENTS, EMPTY_AD_CONFIG, type AdConfig } from '../lib/advertisements/registry';

function configWith(overrides: Partial<AdConfig> = {}): AdConfig {
  return { ...EMPTY_AD_CONFIG, ...overrides };
}

describe('building the form from the stored config', () => {
  it('turns a null slot id into an empty box', () => {
    const form = adsFormFromConfig(configWith({ placements: { 'home-mid': { enabled: true, slotId: '1111111111' } } }));
    expect(form.placements['home-mid']).toEqual({ enabled: true, slotId: '1111111111' });
    expect(form.placements['home-footer']).toEqual({ enabled: true, slotId: '' });
  });

  it('treats an absent placement as enabled, matching the API default', () => {
    const form = adsFormFromConfig(EMPTY_AD_CONFIG);
    Object.values(form.placements).forEach((entry) => expect(entry.enabled).toBe(true));
  });

  it('round-trips every size default', () => {
    const form = adsFormFromConfig(
      configWith({ defaultSlots: { ...EMPTY_AD_CONFIG.defaultSlots, 'half-page': '9999999999' } }),
    );
    expect(form.defaultSlots['half-page']).toBe('9999999999');
    expect(form.defaultSlots.leaderboard).toBe('');
  });

  it('keeps a stored placement the site registry does not know, so it is not silently dropped', () => {
    const config = configWith({ placements: { 'legacy-slot': { enabled: true, slotId: '4444444444' } } });
    const rows = placementRowsFor(config);
    const legacy = rows.find((row) => row.key === 'legacy-slot');
    expect(legacy).toBeDefined();
    expect(legacy?.unregistered).toBe(true);
    expect(adsFormFromConfig(config).placements['legacy-slot']).toEqual({ enabled: true, slotId: '4444444444' });
  });

  it('offers a row for every registered placement', () => {
    expect(placementRowsFor(EMPTY_AD_CONFIG)).toHaveLength(AD_PLACEMENTS.length);
  });
});

describe('validating before submit', () => {
  it('accepts the unconfigured default', () => {
    expect(validateAdsForm(adsFormFromConfig(EMPTY_AD_CONFIG))).toEqual({});
  });

  it('accepts a publisher id with or without the ca- prefix', () => {
    const base = adsFormFromConfig(EMPTY_AD_CONFIG);
    expect(validateAdsForm({ ...base, clientId: 'pub-1234567890123456' }).clientId).toBeUndefined();
    expect(validateAdsForm({ ...base, clientId: 'ca-pub-1234567890123456' }).clientId).toBeUndefined();
  });

  it('rejects a publisher id that is not one', () => {
    const base = adsFormFromConfig(EMPTY_AD_CONFIG);
    expect(validateAdsForm({ ...base, clientId: '1234567890123456' }).clientId).toBeDefined();
  });

  it('treats an empty publisher id as "clear it", not an error', () => {
    const base = adsFormFromConfig(configWith({ clientId: 'pub-1234567890123456' }));
    expect(validateAdsForm({ ...base, clientId: '' }).clientId).toBeUndefined();
  });

  it('rejects a malformed size default that the API would silently drop', () => {
    const base = adsFormFromConfig(EMPTY_AD_CONFIG);
    const errors = validateAdsForm({ ...base, defaultSlots: { ...base.defaultSlots, leaderboard: 'abc' } });
    expect(errors.defaultSlots?.leaderboard).toBeDefined();
  });

  it('rejects a malformed placement slot id that the API would silently drop', () => {
    const base = adsFormFromConfig(EMPTY_AD_CONFIG);
    const errors = validateAdsForm({
      ...base,
      placements: { ...base.placements, 'layout-sidebar': { enabled: true, slotId: 'nope' } },
    });
    expect(errors.placements?.['layout-sidebar']).toBeDefined();
    expect(errors.placements?.['home-mid']).toBeUndefined();
  });

  it('accepts a valid 10-20 digit id', () => {
    const base = adsFormFromConfig(EMPTY_AD_CONFIG);
    const errors = validateAdsForm({
      ...base,
      placements: { ...base.placements, 'layout-sidebar': { enabled: true, slotId: '1234567890' } },
    });
    expect(errors.placements).toBeUndefined();
  });

  it('rejects a reporting id, which normalisation would drop to null', () => {
    const base = adsFormFromConfig(EMPTY_AD_CONFIG);
    const errors = validateAdsForm({
      ...base,
      placements: { ...base.placements, 'layout-sidebar': { enabled: true, slotId: 'ca-pub-1234567890123456:1234567890' } },
    });
    expect(errors.placements?.['layout-sidebar']).toBeDefined();
  });
});

describe('building the save payload', () => {
  it('sends an empty string rather than omitting a cleared slot', () => {
    // The server merges per field and per placement key, so omitting the key would
    // leave the stored value in place. An explicit '' is what clears it.
    const base = adsFormFromConfig(configWith({ placements: { 'home-mid': { enabled: true, slotId: '1111111111' } } }));
    const payload = toAdConfigInput({ ...base, placements: { ...base.placements, 'home-mid': { enabled: true, slotId: '' } } });
    expect(payload.placements?.['home-mid']).toEqual({ enabled: true, slotId: '' });
    expect('home-mid' in (payload.placements ?? {})).toBe(true);
  });

  it('sends every placement so a partial merge cannot leave one stale', () => {
    const payload = toAdConfigInput(adsFormFromConfig(EMPTY_AD_CONFIG));
    Object.entries(payload.placements ?? {}).forEach(([key, value]) => {
      expect(AD_PLACEMENTS.some((placement) => placement.key === key)).toBe(true);
      expect(value).toHaveProperty('enabled');
      expect(value).toHaveProperty('slotId');
    });
  });

  it('sends every size default', () => {
    const payload = toAdConfigInput(adsFormFromConfig(EMPTY_AD_CONFIG));
    expect(Object.keys(payload.defaultSlots ?? {})).toHaveLength(6);
  });

  it('omits clientId when the box is blank, because the API rejects an empty one', () => {
    // `AdConfigDto.clientId` is `@IsOptional()` + `@Matches(...)`, so `undefined`
    // skips validation but `''` comes back as a 400. Omitting leaves the stored id.
    const base = adsFormFromConfig(configWith({ clientId: 'pub-1234567890123456' }));
    const payload = toAdConfigInput({ ...base, clientId: '   ' });
    expect('clientId' in payload).toBe(false);
  });

  it('sends clientId when one is entered', () => {
    const base = adsFormFromConfig(EMPTY_AD_CONFIG);
    const payload = toAdConfigInput({ ...base, clientId: '  ca-pub-1234567890123456  ' });
    expect(payload.clientId).toBe('ca-pub-1234567890123456');
  });

  it('trims values so stray whitespace is not stored', () => {
    const base = adsFormFromConfig(EMPTY_AD_CONFIG);
    const payload = toAdConfigInput({
      ...base,
      clientId: 'pub-1234567890123456',
      placements: { ...base.placements, 'home-mid': { enabled: true, slotId: ' 1234567890 ' } },
    });
    expect(payload.clientId).toBe('pub-1234567890123456');
    expect(payload.placements?.['home-mid']).toEqual({ enabled: true, slotId: '1234567890' });
  });

  it('carries the mode and the gambling opt-in through', () => {
    const payload = toAdConfigInput(adsFormFromConfig(configWith({ mode: 'adsense', gamblingAds: true })));
    expect(payload.mode).toBe('adsense');
    expect(payload.gamblingAds).toBe(true);
  });
});