'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import { AlertTriangle, ChevronDown, Info, Search } from 'lucide-react';
import AdSlotPicker from './AdSlotPicker';
import { AdminField, AdminInput, AdminToggle } from './AdminShared';
import { saveAdConfig } from '../../services/siteSettings';
import type { AdSenseAdUnit } from '../../services/adsense';
import { AD_SIZE_DIMENSIONS, AD_SIZE_LABELS } from '../../lib/advertisements/placements';
import {
  AD_MODES,
  AD_PLACEMENTS,
  AD_SIZES,
  UNREGISTERED_GROUP,
  groupAdPlacementRows,
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

export type AdPlacementRow = AdPlacement & { unregistered?: boolean };

/** `house` is the AdSense term for the built-in creative; nobody outside the API says it. */
const MODE_TITLES: Record<AdMode, string> = {
  off: 'Off',
  house: 'Placeholder',
  adsense: 'Google AdSense',
};

const MODE_DESCRIPTIONS: Record<AdMode, string> = {
  off: 'No ad renders in any slot, on any page. The switches below stay editable so you can set up in advance.',
  house: 'The built-in placeholder creative renders. This is the default, so the site looks unchanged.',
  adsense: 'Real Google AdSense units render. A slot with no ad unit id renders nothing at all.',
};

/**
 * Form state carries every placement in the registry plus any key the API already
 * holds that the registry does not know. Those extras render nowhere, but silently
 * dropping them from the payload would lose whatever an admin configured for them,
 * so they stay editable and are labelled as unregistered.
 */
export function placementRowsFor(config: AdConfig): AdPlacementRow[] {
  const registered = AD_PLACEMENTS as ReadonlyArray<AdPlacement>;
  const known = new Set(registered.map((placement) => placement.key));
  const extras = Object.keys(config.placements || {})
    .filter((key) => !known.has(key))
    .map((key) => ({
      key,
      label: key,
      size: 'leaderboard' as AdSize,
      group: UNREGISTERED_GROUP.id,
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

/**
 * Compared against the payload built from the config the API last returned, so
 * "unsaved changes" means "would change something on the server" rather than "some
 * key was touched". Both sides go through `toAdConfigInput`, which trims and omits
 * `clientId` identically, so a whitespace-only edit is correctly read as no change.
 *
 * Object keys are sorted first: the API merges per placement key, so key order
 * carries no meaning and `JSON.stringify`'s order sensitivity would light up a false
 * "Unsaved changes" on a map that was merely rebuilt in a new order. The payload
 * holds no arrays, so nothing order-sensitive is disturbed.
 */
export function adsFormIsDirty(state: AdsFormState, savedConfig: AdConfig): boolean {
  return canonicalAdConfigInput(toAdConfigInput(state)) !== canonicalAdConfigInput(toAdConfigInput(adsFormFromConfig(savedConfig)));
}

function canonicalAdConfigInput(input: AdConfigInput): string {
  return JSON.stringify(input, (_key, value: unknown) =>
    value && typeof value === 'object' && !Array.isArray(value)
      ? Object.fromEntries(
          Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)),
        )
      : value,
  );
}

/** Only registered placements are counted — an unregistered key renders nowhere. */
export function enabledPlacementCount(state: AdsFormState): { on: number; total: number } {
  const rows = AD_PLACEMENTS as ReadonlyArray<AdPlacement>;
  return {
    on: rows.filter((row) => state.placements[row.key]?.enabled !== false).length,
    total: rows.length,
  };
}

export type PlacementSlotState = 'own' | 'inherited' | 'none';

/**
 * Mirrors `resolveAdSlotId` over the uncommitted form, so a row can say where its
 * ad unit comes from *before* the admin saves.
 */
export function placementSlotState(state: AdsFormState, key: string, size: AdSize): PlacementSlotState {
  if (state.placements[key]?.slotId.trim()) return 'own';
  return state.defaultSlots[size]?.trim() ? 'inherited' : 'none';
}

/**
 * In `adsense` mode a slot with no resolvable ad unit renders nothing at all
 * (`shouldRenderAd`), which reads as "my config did not save". Counting them lets
 * the panel say so up front instead.
 */
export function countSlotsWithoutAdUnit(state: AdsFormState): number {
  const rows = AD_PLACEMENTS as ReadonlyArray<AdPlacement>;
  return rows.filter((row) => {
    if (state.placements[row.key]?.enabled === false) return false;
    return placementSlotState(state, row.key, row.size) === 'none';
  }).length;
}

/** Bulk action behind a group's "All on" / "All off". Keys outside the group are untouched. */
export function setPlacementGroupEnabled(
  state: AdsFormState,
  keys: readonly string[],
  enabled: boolean,
): AdsFormState {
  const placements = { ...state.placements };
  for (const key of keys) {
    placements[key] = { enabled, slotId: placements[key]?.slotId ?? '' };
  }
  return { ...state, placements };
}

export function filterPlacementRows(rows: readonly AdPlacementRow[], query: string): AdPlacementRow[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...rows];
  return rows.filter(
    (row) =>
      row.label.toLowerCase().includes(needle) ||
      row.key.toLowerCase().includes(needle) ||
      row.size.toLowerCase().includes(needle),
  );
}

/* ─── Panel ─── */

export type AdConfigPanelProps = {
  config: AdConfig;
  adUnits: AdSenseAdUnit[];
  /** Owns the "show archived units" filter because it drives a query, not a save. */
  includeArchived: boolean;
  onToggleArchived: () => void;
  /** Message about the fetched ad unit list, shown next to the filter that changes it. */
  adUnitsNotice?: ReactNode;
  onSaved: (_next: AdConfig) => void;
};

export default function AdConfigPanel({
  config,
  adUnits,
  includeArchived,
  onToggleArchived,
  adUnitsNotice,
  onSaved,
}: AdConfigPanelProps) {
  /**
   * The last config known to be on the server. Tracked separately from the `config`
   * prop because the page writes the saved value into the query cache and hands a new
   * object back down: measuring "unsaved changes" against the prop would compare the
   * freshly saved form against the config from before the save and keep claiming the
   * form was dirty after it had been persisted.
   */
  const [saved, setSaved] = useState<AdConfig>(config);
  const [state, setState] = useState<AdsFormState>(() => adsFormFromConfig(config));
  const [errors, setErrors] = useState<AdsFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [defaultsOpen, setDefaultsOpen] = useState(false);

  /**
   * Adopt a config that came from somewhere other than our own save — another tab,
   * or the cache being refetched. Skipped when the incoming config is the one we
   * already reconciled against, so an ordinary parent re-render cannot wipe edits
   * that have not been submitted yet.
   */
  const reconciledRef = useRef(JSON.stringify(config));
  useEffect(() => {
    const incoming = JSON.stringify(config);
    if (incoming === reconciledRef.current) return;
    reconciledRef.current = incoming;
    setSaved(config);
    setState(adsFormFromConfig(config));
    setErrors({});
  }, [config]);

  const rows = useMemo(() => placementRowsFor(saved), [saved]);
  const isAdsense = state.mode === 'adsense';
  const isOff = state.mode === 'off';
  const dirty = adsFormIsDirty(state, saved);
  const { on: enabledCount, total: totalPlacements } = enabledPlacementCount(state);
  const missingAdUnits = isAdsense ? countSlotsWithoutAdUnit(state) : 0;

  // A search must reveal matches in a collapsed group, otherwise typing finds nothing.
  const searching = filter.trim().length > 0;
  const visibleGroups = useMemo(
    () => groupAdPlacementRows(filterPlacementRows(rows, filter)),
    [rows, filter],
  );

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
      const result = await saveAdConfig(toAdConfigInput(state));
      // Reconcile from the server response rather than assuming the input round-tripped:
      // a normalised-away value comes back as `null` and must be reflected in the form.
      const next = result.ads;
      reconciledRef.current = JSON.stringify(next);
      setSaved(next);
      setState(adsFormFromConfig(next));
      setErrors({});
      onSaved(next);
      toast.success('Ad configuration saved.');
    } catch {
      toast.error('Could not save the ad configuration.');
    } finally {
      setSaving(false);
    }
  };

  const onDiscard = () => {
    setState(adsFormFromConfig(saved));
    setErrors({});
  };

  return (
    <form onSubmit={onSave} noValidate className="space-y-5">
      {/* ── Delivery ── */}
      <Panel>
        <PanelHeading
          title="Delivery mode"
          hint="Applies to every placement on the public site."
        />

        <div role="radiogroup" aria-label="Advertisement delivery mode" className="grid gap-2 sm:grid-cols-3">
          {AD_MODES.map((mode) => {
            const selected = state.mode === mode;
            return (
              <label
                key={mode}
                className="flex cursor-pointer flex-col gap-1 rounded-md p-3 text-xs transition-colors"
                style={{
                  border: `1px solid ${selected ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                  background: selected ? 'var(--admin-info-bg)' : 'var(--admin-input-bg)',
                }}
              >
                <span className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="ads-mode"
                    value={mode}
                    checked={selected}
                    onChange={() => setState((prev) => ({ ...prev, mode }))}
                  />
                  <span className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                    {MODE_TITLES[mode]}
                  </span>
                  {selected ? <Badge tone="accent">{state.mode}</Badge> : null}
                </span>
                <span style={{ color: 'var(--admin-text-muted)' }}>{MODE_DESCRIPTIONS[mode]}</span>
              </label>
            );
          })}
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <AdminField
              label="AdSense publisher id"
              htmlFor="ads-client-id"
              hint={
                isAdsense
                  ? 'Paste it straight from the AdSense dashboard. The ca- prefix is optional and is stripped on save.'
                  : 'Only used in AdSense mode.'
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

            {errors.clientId ? (
              <p className="mt-2 text-[11px] font-medium" style={{ color: 'var(--admin-danger)' }}>
                {errors.clientId}
              </p>
            ) : null}

            {saved.clientId && !state.clientId.trim() ? (
              <p className="mt-2 text-[11px] font-medium" style={{ color: 'var(--admin-warning, var(--color-warning))' }}>
                Clearing this box will not remove the stored publisher id — the API rejects an empty
                clientId and keeps the previous value. Switch the mode to Off or Placeholder instead.
              </p>
            ) : null}
          </div>

          {/* The switch and its caption are one control, so the visible text is also the
              accessible name. The two used to disagree, which meant a screen reader
              announced something different from the words on screen. */}
          <div className="flex items-start gap-3 rounded-md p-3" style={{ border: '1px solid var(--admin-border)' }}>
            <AdminToggle
              checked={state.gamblingAds}
              label="Allow ads on /odds and /predictions"
              onChange={() => setState((prev) => ({ ...prev, gamblingAds: !prev.gamblingAds }))}
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
                Allow ads on /odds and /predictions
              </p>
              <p className="mt-0.5 text-[11px] leading-snug" style={{ color: 'var(--admin-text-muted)' }}>
                Off by default. This gates the shared placements too, so the sidebar and the global
                top banner disappear on those routes as well.
              </p>
            </div>
          </div>
        </div>

        {isOff ? (
          <Callout tone="info" icon={<Info size={14} aria-hidden />}>
            Ads are off, so no slot will render regardless of the switches below. They stay editable
            so you can set the site up before switching on.
          </Callout>
        ) : null}

        {isAdsense && missingAdUnits > 0 ? (
          <Callout tone="warning" icon={<AlertTriangle size={14} aria-hidden />}>
            {missingAdUnits} of {totalPlacements} placements have no ad unit id and will render nothing.
            Give them an id below, or set a default for their size.
          </Callout>
        ) : null}
      </Panel>

      {/* ── Size defaults ── */}
      <Panel>
        <PanelHeading
          title="Ad unit defaults"
          hint="Used by any placement that has no ad unit id of its own."
          action={
            <button
              type="button"
              onClick={() => setDefaultsOpen((prev) => !prev)}
              aria-expanded={defaultsOpen}
              className="flex shrink-0 items-center gap-1.5 text-xs font-semibold"
              style={{ color: 'var(--admin-accent)' }}
            >
              {defaultsOpen ? 'Hide' : 'Show'}
              <ChevronDown
                size={14}
                aria-hidden
                className="transition-transform"
                style={{ transform: defaultsOpen ? 'rotate(180deg)' : 'none' }}
              />
            </button>
          }
        />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px]">
          <AdminToggle
            checked={includeArchived}
            label="Show archived ad units in the dropdowns"
            onChange={onToggleArchived}
          />
          <span style={{ color: 'var(--admin-text-secondary)' }}>
            Show archived ad units in the dropdowns
          </span>
          <span style={{ color: 'var(--admin-text-muted)' }}>
            {adUnits.length} unit{adUnits.length === 1 ? '' : 's'} listed
          </span>
        </div>
        {adUnitsNotice ? <div className="mt-2">{adUnitsNotice}</div> : null}

        {defaultsOpen ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {AD_SIZES.map((size) => (
              <AdminField
                key={size}
                label={AD_SIZE_LABELS[size].label}
                hint={`${AD_SIZE_DIMENSIONS[size].label} · ${AD_SIZE_LABELS[size].hint}`}
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
        ) : null}
      </Panel>

      {/* ── Placements ── */}
      <Panel>
        <PanelHeading
          title="Placements"
          hint={
            <>
              {enabledCount} of {totalPlacements} on. A placement with no ad unit of its own
              inherits the default for its size.
            </>
          }
        />

        <div className="mb-3 flex flex-wrap items-center gap-3">
          <span className="relative inline-flex min-w-0 flex-1 items-center sm:max-w-xs">
            <Search
              size={14}
              aria-hidden
              className="pointer-events-none absolute left-2.5"
              style={{ color: 'var(--admin-text-muted)' }}
            />
            <AdminInput
              type="search"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Filter placements"
              placeholder="Filter by page or slot key"
              style={{ paddingLeft: '1.875rem' }}
            />
          </span>
          {searching ? (
            <>
              <span className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                {visibleGroups.reduce((total, group) => total + group.rows.length, 0)} matching
              </span>
              <button
                type="button"
                onClick={() => setFilter('')}
                className="text-[11px] font-semibold"
                style={{ color: 'var(--admin-accent)' }}
              >
                Clear
              </button>
            </>
          ) : null}
        </div>

        <div className="space-y-2">
          {visibleGroups.map((group) => {
            const keys = group.rows.map((row) => row.key);
            const groupOn = group.rows.filter((row) => state.placements[row.key]?.enabled !== false).length;
            const open = searching || openGroups[group.id] === true;

            return (
              <div
                key={group.id}
                role="group"
                aria-label={`${group.label} placements`}
                className="overflow-hidden rounded-md"
                style={{ border: '1px solid var(--admin-border)' }}
              >
                <div className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setOpenGroups((prev) => ({ ...prev, [group.id]: !open }))}
                    aria-expanded={open}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <ChevronDown
                      size={15}
                      aria-hidden
                      className="shrink-0 transition-transform"
                      style={{
                        transform: open ? 'rotate(180deg)' : 'none',
                        color: 'var(--admin-text-muted)',
                      }}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
                        {group.label}
                      </span>
                      <span className="block truncate text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
                        {group.hint}
                      </span>
                    </span>
                  </button>

                  <Badge tone={groupOn === group.rows.length ? 'success' : 'neutral'}>
                    {groupOn}/{group.rows.length} on
                  </Badge>

                  <span className="flex shrink-0 items-center gap-1">
                    <BulkButton
                      label={`Turn on every placement in ${group.label}`}
                      disabled={groupOn === group.rows.length}
                      onClick={() => setState((prev) => setPlacementGroupEnabled(prev, keys, true))}
                    >
                      All on
                    </BulkButton>
                    <BulkButton
                      label={`Turn off every placement in ${group.label}`}
                      disabled={groupOn === 0}
                      onClick={() => setState((prev) => setPlacementGroupEnabled(prev, keys, false))}
                    >
                      All off
                    </BulkButton>
                  </span>
                </div>

                <div hidden={!open} className="border-t px-3 py-2" style={{ borderColor: 'var(--admin-border)' }}>
                  <ul className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
                    {group.rows.map((row) => (
                      <PlacementRow
                        key={row.key}
                        row={row}
                        entry={state.placements[row.key] ?? { enabled: true, slotId: '' }}
                        slotState={placementSlotState(state, row.key, row.size)}
                        error={errors.placements?.[row.key]}
                        adUnits={adUnits}
                        onToggleEnabled={() =>
                          setPlacement(row.key, { enabled: state.placements[row.key]?.enabled === false })
                        }
                        onChangeSlotId={(slotId) => setPlacement(row.key, { slotId: slotId ?? '' })}
                      />
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {visibleGroups.length === 0 ? (
          <p className="rounded-md px-3 py-6 text-center text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            No placement matches “{filter.trim()}”.
          </p>
        ) : null}
      </Panel>

      {/* ── Actions ── */}
      <div
        className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 rounded-lg px-4 py-3"
        style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
      >
        <button type="submit" className="btn-brand rounded-lg px-5 py-2.5 text-sm font-bold" disabled={saving || !dirty}>
          {saving ? 'Saving…' : 'Save ad configuration'}
        </button>
        <button
          type="button"
          onClick={onDiscard}
          disabled={saving || !dirty}
          className="rounded-lg px-3 py-2.5 text-xs font-bold"
          style={{
            border: '1px solid var(--admin-border)',
            color: 'var(--admin-text-secondary)',
            opacity: dirty ? 1 : 0.5,
          }}
        >
          Discard changes
        </button>
        <p className="text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
          {dirty ? 'Unsaved changes.' : 'Saved.'} Server-rendered pages pick this up within 60 seconds.
        </p>
      </div>
    </form>
  );
}

/* ─── Row ─── */

function PlacementRow({
  row,
  entry,
  slotState,
  error,
  adUnits,
  onToggleEnabled,
  onChangeSlotId,
}: {
  row: AdPlacementRow;
  entry: { enabled: boolean; slotId: string };
  slotState: PlacementSlotState;
  error?: string;
  adUnits: AdSenseAdUnit[];
  onToggleEnabled: () => void;
  onChangeSlotId: (_slotId: string | null) => void;
}) {
  const enabled = entry.enabled !== false;
  const sizeLabel = AD_SIZE_LABELS[row.size];

  return (
    <li className="flex flex-wrap items-center gap-3 py-2.5 sm:flex-nowrap">
      <AdminToggle checked={enabled} label={`Enable ${row.label}`} onChange={onToggleEnabled} />

      <div className="min-w-0 flex-1 basis-48">
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="truncate text-xs font-semibold"
            style={{ color: enabled ? 'var(--admin-text)' : 'var(--admin-text-muted)' }}
          >
            {row.label}
          </span>
          {row.inFeed ? <Badge tone="neutral">in feed</Badge> : null}
          {enabled && slotState === 'none' ? <Badge tone="warning">no ad unit</Badge> : null}
          {enabled && slotState === 'inherited' ? <Badge tone="neutral">size default</Badge> : null}
        </div>
        <span className="block truncate font-mono text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
          {row.key}
          {row.unregistered ? ' · not in the registry, renders nowhere' : ''}
        </span>
      </div>

      <span
        className="hidden w-40 shrink-0 text-[11px] lg:block"
        style={{ color: 'var(--admin-text-secondary)' }}
        title={`${sizeLabel.label} · ${AD_SIZE_DIMENSIONS[row.size].label}`}
      >
        {sizeLabel.label}
        <span className="block text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
          {AD_SIZE_DIMENSIONS[row.size].label}
        </span>
      </span>

      <div className="min-w-0 flex-1 basis-64">
        <AdSlotPicker
          id={`ads-placement-${row.key}`}
          value={entry.slotId || null}
          adUnits={adUnits}
          invalid={Boolean(error)}
          disabled={!enabled}
          onChange={onChangeSlotId}
        />
        {error ? (
          <span className="mt-1.5 block text-[11px] font-medium" style={{ color: 'var(--admin-danger)' }}>
            {error}
          </span>
        ) : null}
      </div>
    </li>
  );
}

/* ─── Small parts ─── */

function Panel({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-lg p-4" style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}>
      {children}
    </section>
  );
}

function PanelHeading({ title, hint, action }: { title: string; hint?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h2 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--admin-text-secondary)' }}>
          {title}
        </h2>
        {hint ? (
          <p className="mt-1 text-xs" style={{ color: 'var(--admin-text-muted)' }}>
            {hint}
          </p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

function Callout({
  tone,
  icon,
  children,
}: {
  tone: 'info' | 'warning';
  icon: ReactNode;
  children: ReactNode;
}) {
  const color = tone === 'warning' ? 'var(--admin-warning, var(--color-warning))' : 'var(--admin-text-secondary)';
  return (
    <p
      className="mt-4 flex items-start gap-2 rounded-md px-3 py-2 text-[11px] font-medium leading-snug"
      style={{ border: `1px solid ${color}`, color }}
    >
      <span className="mt-px shrink-0">{icon}</span>
      <span>{children}</span>
    </p>
  );
}

function Badge({ tone, children }: { tone: 'accent' | 'neutral' | 'success' | 'warning'; children: ReactNode }) {
  const tones = {
    accent: { border: 'var(--admin-accent)', color: 'var(--admin-accent)' },
    neutral: { border: 'var(--admin-border)', color: 'var(--admin-text-muted)' },
    success: { border: 'var(--admin-success)', color: 'var(--admin-success)' },
    warning: { border: 'var(--admin-warning, var(--color-warning))', color: 'var(--admin-warning, var(--color-warning))' },
  } as const;
  return (
    <span
      className="shrink-0 rounded px-1.5 py-px text-[10px] font-semibold whitespace-nowrap"
      style={{ border: `1px solid ${tones[tone].border}`, color: tones[tone].color }}
    >
      {children}
    </span>
  );
}

function BulkButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="rounded px-2 py-1 text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-40"
      style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }}
    >
      {children}
    </button>
  );
}
