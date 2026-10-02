import {
  adsFormFromConfig,
  adsFormIsDirty,
  countSlotsWithoutAdUnit,
  enabledPlacementCount,
  filterPlacementRows,
  placementRowsFor,
  placementSlotState,
  setPlacementGroupEnabled,
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

describe('telling the admin what has not been saved yet', () => {
  it('reads a freshly built form as clean', () => {
    expect(adsFormIsDirty(adsFormFromConfig(EMPTY_AD_CONFIG), EMPTY_AD_CONFIG)).toBe(false);
  });

  it('does not call a whitespace-only edit a change', () => {
    // Both sides go through `toAdConfigInput`, which trims, so typing a trailing
    // space must not light up "unsaved changes".
    const base = adsFormFromConfig(configWith({ clientId: 'pub-1234567890123456' }));
    expect(adsFormIsDirty({ ...base, clientId: '  pub-1234567890123456  ' }, configWith({ clientId: 'pub-1234567890123456' }))).toBe(false);
  });

  it('spots a flipped placement switch, a mode change and the gambling opt-in', () => {
    const base = adsFormFromConfig(EMPTY_AD_CONFIG);
    const config = EMPTY_AD_CONFIG;
    expect(adsFormIsDirty({ ...base, mode: 'off' }, config)).toBe(true);
    expect(adsFormIsDirty({ ...base, gamblingAds: true }, config)).toBe(true);
    expect(
      adsFormIsDirty(
        { ...base, placements: { ...base.placements, 'home-mid': { enabled: false, slotId: '' } } },
        config,
      ),
    ).toBe(true);
  });

  it('sees a cleared size default as a change', () => {
    const stored = configWith({ defaultSlots: { ...EMPTY_AD_CONFIG.defaultSlots, leaderboard: '1111111111' } });
    const form = adsFormFromConfig(stored);
    expect(adsFormIsDirty(form, stored)).toBe(false);
    expect(
      adsFormIsDirty({ ...form, defaultSlots: { ...form.defaultSlots, leaderboard: '' } }, stored),
    ).toBe(true);
  });

  it('ignores the order the placement keys happen to be in', () => {
    const base = adsFormFromConfig(EMPTY_AD_CONFIG);
    const reversed = Object.fromEntries(Object.entries(base.placements).reverse()) as typeof base.placements;
    expect(adsFormIsDirty({ ...base, placements: reversed }, EMPTY_AD_CONFIG)).toBe(false);
  });
});

describe('summarising the placements for the panel header', () => {
  it('counts every registered placement as on when the API holds no opinion', () => {
    expect(enabledPlacementCount(adsFormFromConfig(EMPTY_AD_CONFIG))).toEqual({
      on: AD_PLACEMENTS.length,
      total: AD_PLACEMENTS.length,
    });
  });

  it('subtracts the disabled ones', () => {
    const form = adsFormFromConfig(EMPTY_AD_CONFIG);
    const next = {
      ...form,
      placements: { ...form.placements, 'home-mid': { enabled: false, slotId: '' } },
    };
    expect(enabledPlacementCount(next).on).toBe(AD_PLACEMENTS.length - 1);
  });
});

describe('where a placement gets its ad unit from', () => {
  it('prefers the placement id, then the size default, then nothing', () => {
    const form = adsFormFromConfig(
      configWith({ defaultSlots: { ...EMPTY_AD_CONFIG.defaultSlots, 'medium-rectangle': '2222222222' } }),
    );
    expect(placementSlotState(form, 'home-sidebar', 'medium-rectangle')).toBe('inherited');
    expect(placementSlotState(form, 'home-mid', 'leaderboard')).toBe('none');
    expect(
      placementSlotState(
        { ...form, placements: { ...form.placements, 'home-sidebar': { enabled: true, slotId: '3333333333' } } },
        'home-sidebar',
        'medium-rectangle',
      ),
    ).toBe('own');
  });

  it('counts enabled placements that would render nothing in adsense mode', () => {
    // `shouldRenderAd` returns false for these, which used to look like a failed save.
    const form = adsFormFromConfig(
      configWith({
        defaultSlots: { ...EMPTY_AD_CONFIG.defaultSlots, leaderboard: '1111111111' },
      }),
    );
    // Every leaderboard placement resolves; the rectangle and half-page ones do not.
    const missing = countSlotsWithoutAdUnit(form);
    expect(missing).toBeGreaterThan(0);
    expect(missing).toBeLessThan(AD_PLACEMENTS.length);
  });

  it('ignores a disabled placement when counting what will render nothing', () => {
    const form = adsFormFromConfig(EMPTY_AD_CONFIG);
    const withOneOff = {
      ...form,
      placements: Object.fromEntries(
        Object.entries(form.placements).map(([key, entry]) => [key, { ...entry, enabled: false }]),
      ),
    };
    expect(countSlotsWithoutAdUnit(withOneOff)).toBe(0);
  });
});

describe('bulk actions on a placement group', () => {
  it('flips every key in the group and leaves the rest alone', () => {
    const form = adsFormFromConfig(EMPTY_AD_CONFIG);
    const keys = ['home-mid', 'home-footer'];
    const next = setPlacementGroupEnabled(form, keys, false);
    expect(next.placements['home-mid'].enabled).toBe(false);
    expect(next.placements['home-footer'].enabled).toBe(false);
    expect(next.placements['news-list-bottom'].enabled).toBe(true);
    expect(next.mode).toBe(form.mode);
    expect(next.gamblingAds).toBe(form.gamblingAds);
  });

  it('keeps each row ad unit when it turns a group back on', () => {
    const form = adsFormFromConfig(configWith({ placements: { 'home-mid': { enabled: true, slotId: '1111111111' } } }));
    const off = setPlacementGroupEnabled(form, ['home-mid'], false);
    const on = setPlacementGroupEnabled(off, ['home-mid'], true);
    expect(on.placements['home-mid']).toEqual({ enabled: true, slotId: '1111111111' });
  });

  it('creates an entry for a key the form had not seen', () => {
    const form = adsFormFromConfig(EMPTY_AD_CONFIG);
    expect(form.placements['not-a-key']).toBeUndefined();
    expect(setPlacementGroupEnabled(form, ['not-a-key'], false).placements['not-a-key']).toEqual({
      enabled: false,
      slotId: '',
    });
  });
});

describe('filtering the placement list', () => {
  const rows = placementRowsFor(EMPTY_AD_CONFIG);

  it('returns everything for an empty or whitespace query', () => {
    expect(filterPlacementRows(rows, '')).toHaveLength(rows.length);
    expect(filterPlacementRows(rows, '   ')).toHaveLength(rows.length);
  });

  it('matches on the visible label', () => {
    const hits = filterPlacementRows(rows, 'sidebar');
    expect(hits.length).toBeGreaterThan(0);
    hits.forEach((row) => expect(row.label.toLowerCase()).toContain('sidebar'));
  });

  it('matches on the storage key, which is what an admin reads off a call site', () => {
    expect(filterPlacementRows(rows, 'home-mid').map((row) => row.key)).toEqual(['home-mid']);
    expect(filterPlacementRows(rows, 'prediction-detail')).toHaveLength(2);
  });

  it('is case-insensitive and matches the size name', () => {
    expect(filterPlacementRows(rows, 'HALF-PAGE')).toHaveLength(2);
  });

  it('returns nothing rather than everything when there is no match', () => {
    expect(filterPlacementRows(rows, 'zzzz-no-such-placement')).toEqual([]);
  });
});
