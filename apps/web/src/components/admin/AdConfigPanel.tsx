'use client';

import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import AdSlotPicker from './AdSlotPicker';
import { AdminField, AdminInput, AdminToggle } from './AdminShared';
import { saveAdConfig } from '../../services/siteSettings';
import type { AdSenseAdUnit } from '../../services/adsense';
import { AD_SIZE_DIMENSIONS } from '../../lib/advertisements/placements';
import {
  AD_MODES,
  AD_PLACEMENTS,
  AD_SIZES,
  isValidAdUnitId,
  isValidPublisherId,
  type AdConfig,
  type AdConfigInput,
  type AdMode,
  type AdPlacement,
  type AdSize,
} from '../../lib/advertisements/registry';

/* ─── Form state ─── */

export type AdsFormState = {
  mode: AdMode;
  clientId: string;
  /** `''` means "no ad unit for this size". */
  defaultSlots: Record<AdSize, string>;
  placements: Record<string, { enabled: boolean; slotId: string }>;
  gamblingAds: boolean;
};

export type AdsFormErrors = {
  clientId?: string;
  defaultSlots?: Partial<Record<AdSize, string>>;
  placements?: Record<string, string>;
};

const MODE_DESCRIPTIONS: Record<AdMode, string> = {
  off: 'No ad renders in any slot, on any page.',
  house: 'The built-in placeholder creative renders. This is the default, so the site looks unchanged.',
  adsense: 'Real Google AdSense units render. A slot with no ad unit id renders nothing.',
};

/**
 * Form state carries every placement in the registry plus any key the API already
 * holds that the registry does not know. Those extras render nowhere, but silently
 * dropping them from the payload would lose whatever an admin configured for them,
 * so they stay editable and are labelled as unregistered.
 */
export function placementRowsFor(config: AdConfig): Array<AdPlacement & { unregistered?: boolean }> {
  const registered = AD_PLACEMENTS as ReadonlyArray<AdPlacement>;
  const known = new Set(registered.map((placement) => placement.key));
  const extras = Object.keys(config.placements || {})
    .filter((key) => !known.has(key))
    .map((key) => ({
      key,
      label: key,
      size: 'leaderboard' as AdSize,
      unregistered: true,
    }));
  return [...registered, ...extras];
}

export function adsFormFromConfig(config: AdConfig): AdsFormState {
  const placements: AdsFormState['placements'] = {};
  for (const row of placementRowsFor(config)) {
    const stored = config.placements?.[row.key];
    placements[row.key] = {
      // The API normalises `enabled` to `rawValue.enabled !== false`, so a placement
      // absent from the map is on.
      enabled: stored ? stored.enabled !== false : true,
      slotId: stored?.slotId ?? '',
    };
  }

  const defaultSlots = {} as Record<AdSize, string>;
  for (const size of AD_SIZES) defaultSlots[size] = config.defaultSlots?.[size] ?? '';

  return {
    mode: config.mode ?? 'house',
    clientId: config.clientId ?? '',
    defaultSlots,
    placements,
    gamblingAds: config.gamblingAds === true,
  };
}

/**
 * The API does not validate slot ids. `defaultSlots` and `placements` are
 * `Record<string, …>` without `@ValidateNested`, so class-validator never descends
 * into them and a bad id returns 200 with the value silently normalised to `null`.
 * Everything here has to be caught before submit.
 */
export function validateAdsForm(state: AdsFormState): AdsFormErrors {
  const errors: AdsFormErrors = {};

  if (state.clientId.trim() && !isValidPublisherId(state.clientId)) {
    errors.clientId = 'Must look like pub-1234567890123456. The ca- prefix is optional.';
  }

  const defaultSlots: Partial<Record<AdSize, string>> = {};
  for (const size of AD_SIZES) {
    const value = state.defaultSlots[size].trim();
    if (value && !isValidAdUnitId(value)) defaultSlots[size] = 'Must be 10–20 digits, e.g. 1234567890.';
  }
  if (Object.keys(defaultSlots).length) errors.defaultSlots = defaultSlots;

  const placements: Record<string, string> = {};
  for (const [key, entry] of Object.entries(state.placements)) {
    const value = entry.slotId.trim();
    if (value && !isValidAdUnitId(value)) placements[key] = 'Must be 10–20 digits, e.g. 1234567890.';
  }
  if (Object.keys(placements).length) errors.placements = placements;

  return errors;
}

/**
 * An empty string is sent rather than omitted for slot ids: the server merges per
 * field and per placement key, so an explicit `''` is what clears a stored id (it
 * normalises to `null`), whereas omitting the key would leave the old value in place.
 *
 * `clientId` is the exception. `AdConfigDto.clientId` carries
 * `@Matches(/^(ca-)?pub-\d{10,20}$/i)` behind `@IsOptional()`, so `undefined` skips
 * validation but `''` does not and comes back as a 400. The key is therefore omitted
 * when the box is blank, which leaves the stored publisher id untouched.
 */
export function toAdConfigInput(state: AdsFormState): AdConfigInput {
  const placements: AdConfigInput['placements'] = {};
  for (const [key, entry] of Object.entries(state.placements)) {
    placements[key] = { enabled: entry.enabled, slotId: entry.slotId.trim() };
  }

  const defaultSlots: Record<string, string> = {};
  for (const size of AD_SIZES) defaultSlots[size] = state.defaultSlots[size].trim();

  const clientId = state.clientId.trim();

  return {
    mode: state.mode,
    ...(clientId ? { clientId } : {}),
    defaultSlots,
    placements,
    gamblingAds: state.gamblingAds,
  };
}

/* ─── Panel ─── */

export type AdConfigPanelProps = {
  config: AdConfig;
  adUnits: AdSenseAdUnit[];
  onSaved: (_next: AdConfig) => void;
};

export default function AdConfigPanel({ config, adUnits, onSaved }: AdConfigPanelProps) {
  const [state, setState] = useState<AdsFormState>(() => adsFormFromConfig(config));
  const [errors, setErrors] = useState<AdsFormErrors>({});
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => placementRowsFor(config), [config]);
  const isAdsense = state.mode === 'adsense';

  const setPlacement = (key: string, patch: Partial<{ enabled: boolean; slotId: string }>) => {
    setState((prev) => ({
      ...prev,
      placements: {
        ...prev.placements,
        [key]: { enabled: prev.placements[key]?.enabled !== false, slotId: '', ...prev.placements[key], ...patch },
      },
    }));
  };

  const onSave = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors = validateAdsForm(state);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      toast.error('Please fix the highlighted fields.');
      return;
    }

    setSaving(true);
    try {
      const saved = await saveAdConfig(toAdConfigInput(state));
      // Reconcile from the server response rather than assuming the input round-tripped:
      // a normalised-away value comes back as `null` and must be reflected in the form.
      setState(adsFormFromConfig(saved.ads));
      onSaved(saved.ads);
      toast.success('Ad configuration saved.');
    } catch {
      toast.error('Could not save the ad configuration.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSave} noValidate className="space-y-5">
      <section
        className="rounded-lg p-4"
        style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
      >
        <h2 className="mb-1 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>
          Delivery mode
        </h2>
        <p className="mb-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          Changes apply to every placement on the public site.
        </p>

        <div role="radiogroup" aria-label="Advertisement delivery mode" className="grid gap-2 sm:grid-cols-3">
          {AD_MODES.map((mode) => (
            <label
              key={mode}
              className="flex cursor-pointer flex-col gap-1 rounded-md p-3 text-xs transition-colors"
              style={{
                border: `1px solid ${state.mode === mode ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                background: state.mode === mode ? 'var(--admin-info-bg)' : 'var(--admin-input-bg)',
              }}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="ads-mode"
                  value={mode}
                  checked={state.mode === mode}
                  onChange={() => setState((prev) => ({ ...prev, mode }))}
                />
                <span className="text-sm font-semibold capitalize" style={{ color: 'var(--admin-text)' }}>
                  {mode}
                </span>
              </span>
              <span style={{ color: 'var(--admin-text-muted)' }}>{MODE_DESCRIPTIONS[mode]}</span>
            </label>
          ))}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <AdminField
            label="AdSense publisher id"
            htmlFor="ads-client-id"
            hint={
              isAdsense
                ? 'Paste it straight from the AdSense dashboard. The ca- prefix is optional and is stripped on save.'
                : 'Only used in adsense mode.'
            }
          >
            <AdminInput
              id="ads-client-id"
              value={state.clientId}
              aria-invalid={Boolean(errors.clientId) || undefined}
              onChange={(event) => setState((prev) => ({ ...prev, clientId: event.target.value }))}
              placeholder="pub-1234567890123456"
              style={errors.clientId ? { borderColor: 'var(--admin-danger)' } : undefined}
            />
          </AdminField>

          {config.clientId && !state.clientId.trim() ? (
            <p className="-mt-2 text-[11px] font-medium" style={{ color: 'var(--admin-warning, var(--color-warning))' }}>
              Clearing this box will not remove the stored publisher id — the API rejects an empty
              clientId and keeps the previous value. Switch the mode to off or house instead.
            </p>
          ) : null}

          <div className="flex items-start gap-3 rounded-md p-3" style={{ border: '1px solid var(--admin-border)' }}>
            <AdminToggle
              checked={state.gamblingAds}
              label="Show ads on betting-adjacent routes"
              onChange={() => setState((prev) => ({ ...prev, gamblingAds: !prev.gamblingAds }))}
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
                Allow ads on /odds and /predictions
              </p>
              <p className="mt-0.5 text-[11px] leading-snug" style={{ color: 'var(--admin-text-muted)' }}>
                Off by default. This gates the shared placements too, so the sidebar and the global top
                banner disappear on those routes as well.
              </p>
            </div>
          </div>
        </div>

        {errors.clientId ? (
          <p className="mt-2 text-[11px] font-medium" style={{ color: 'var(--admin-danger)' }}>
            {errors.clientId}
          </p>
        ) : null}
      </section>

      <section
        className="rounded-lg p-4"
        style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
      >
        <h2 className="mb-1 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>
          Default ad unit per size
        </h2>
        <p className="mb-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          Used whenever a placement has no ad unit of its own.
        </p>

        <div className="grid gap-3 sm:grid-cols-2">
          {AD_SIZES.map((size) => (
            <AdminField
              key={size}
              label={`${size} · ${AD_SIZE_DIMENSIONS[size].label}`}
              htmlFor={`ads-default-${size}`}
            >
              <AdSlotPicker
                id={`ads-default-${size}`}
                value={state.defaultSlots[size] || null}
                adUnits={adUnits}
                invalid={Boolean(errors.defaultSlots?.[size])}
                onChange={(value) =>
                  setState((prev) => ({ ...prev, defaultSlots: { ...prev.defaultSlots, [size]: value ?? '' } }))
                }
              />
              {errors.defaultSlots?.[size] ? (
                <span className="mt-1.5 block text-[11px] font-medium" style={{ color: 'var(--admin-danger)' }}>
                  {errors.defaultSlots[size]}
                </span>
              ) : null}
            </AdminField>
          ))}
        </div>
      </section>

      <section
        className="rounded-lg p-4"
        style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
      >
        <h2 className="mb-1 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>
          Placements
        </h2>
        <p className="mb-3 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
          A placement with no ad unit of its own inherits the default for its size.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] border-collapse text-left">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--admin-border)' }}>
                {['On', 'Placement', 'Size', 'Ad unit id'].map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="px-2 py-2 text-[11px] font-bold uppercase tracking-wide"
                    style={{ color: 'var(--admin-text-muted)' }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const entry = state.placements[row.key] ?? { enabled: true, slotId: '' };
                return (
                  <tr key={row.key} style={{ borderBottom: '1px solid var(--admin-border)' }}>
                    <td className="px-2 py-2">
                      <AdminToggle
                        checked={entry.enabled !== false}
                        label={`Enable ${row.label}`}
                        onChange={() => setPlacement(row.key, { enabled: entry.enabled === false })}
                      />
                    </td>
                    <td className="px-2 py-2">
                      <span className="block text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
                        {row.label}
                      </span>
                      <span className="font-mono text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
                        {row.key}
                      </span>
                      {row.unregistered ? (
                        <span
                          className="mt-1 block text-[10px] font-semibold"
                          style={{ color: 'var(--admin-warning, var(--color-warning))' }}
                        >
                          Not in the site registry — renders nowhere.
                        </span>
                      ) : null}
                    </td>
                    <td className="px-2 py-2 text-[11px]" style={{ color: 'var(--admin-text-secondary)' }}>
                      <span className="block">{row.size}</span>
                      <span className="text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
                        {AD_SIZE_DIMENSIONS[row.size].label}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <AdSlotPicker
                        id={`ads-placement-${row.key}`}
                        value={entry.slotId || null}
                        adUnits={adUnits}
                        invalid={Boolean(errors.placements?.[row.key])}
                        disabled={entry.enabled === false}
                        onChange={(slotId) => setPlacement(row.key, { slotId: slotId ?? '' })}
                      />
                      {errors.placements?.[row.key] ? (
                        <span className="mt-1.5 block text-[11px] font-medium" style={{ color: 'var(--admin-danger)' }}>
                          {errors.placements[row.key]}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-brand rounded-lg px-5 py-2.5 text-sm font-bold" disabled={saving}>
          {saving ? 'Saving…' : 'Save ad configuration'}
        </button>
        <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
          Server-rendered pages pick this up within 60 seconds.
        </p>
      </div>
    </form>
  );
}