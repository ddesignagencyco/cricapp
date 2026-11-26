'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Database,
  Info,
  Lock,
  Pencil,
  Search,
} from 'lucide-react';
import AdSlotPicker from './AdSlotPicker';
import { AdminField, AdminInput, AdminToggle } from './AdminShared';
import { saveAdConfig } from '../../services/siteSettings';
import type { AdSenseAdUnit } from '../../services/adsense';
import { AD_SIZE_LABELS } from '../../lib/advertisements/placements';
import {
  AD_MODES,
  AD_PLACEMENTS,
  AD_SIZES,
  DEFAULT_ADSTERRA_HOST,
  UNREGISTERED_GROUP,
  groupAdPlacementRows,
  isValidAdUnitId,
  isValidAdsterraHost,
  isValidAdsterraKey,
  isValidHttpsUrl,
  isValidPublisherId,
  parseAdsterraInput,
  type AdConfig,
  type AdConfigInput,
  type AdMode,
  type AdPlacement,
  type AdSize,
} from '../../lib/advertisements/registry';

/* ─── Confirmed size metadata ─── */

const CONFIRMED_SIZE_BADGE: Record<AdSize, string> = {
  leaderboard: '728 × 90 px',
  'tablet-banner': '468 × 60 px',
  'mobile-banner': '320 × 50 px',
  'medium-rectangle': '300 × 250 px',
  'large-rectangle': '336 × 280 px',
  'half-page': '160 × 600 px',
};

const ADSTERRA_SIZE_META: Partial<Record<AdSize, { unitName: string; tag: 'Recommended' | 'Mobile' | 'Optional'; hint: string }>> = {
  leaderboard: {
    unitName: 'Banner 728×90',
    tag: 'Recommended',
    hint: 'Top, mid-page & footer banners across the entire site.',
  },
  'medium-rectangle': {
    unitName: 'Banner 300×250',
    tag: 'Recommended',
    hint: 'Sidebars, in-feed cards & in-article boxes (also covers 336×280 slots).',
  },
  'mobile-banner': {
    unitName: 'Banner 320×50',
    tag: 'Mobile',
    hint: 'Dedicated mobile banner slots.',
  },
  'tablet-banner': {
    unitName: 'Banner 468×60',
    tag: 'Optional',
    hint: 'Narrow banner for tablet widths.',
  },
  'half-page': {
    unitName: 'Banner 160×600',
    tag: 'Optional',
    hint: 'Tall skyscraper for wide sidebars (PSL & predictions).',
  },
};

const ADSTERRA_SIZES: AdSize[] = [
  'leaderboard',
  'medium-rectangle',
  'mobile-banner',
  'tablet-banner',
  'half-page',
];

const CONFIRMED_SIZE_USAGE_COUNT: Record<AdSize, number> = AD_SIZES.reduce(
  (acc, size) => {
    acc[size] = AD_PLACEMENTS.filter((p) => p.size === size).length;
    return acc;
  },
  {} as Record<AdSize, number>,
);

/* ─── Form state ─── */

export type AdsFormState = {
  mode: AdMode;
  clientId: string;
  /** `''` means "no ad unit for this size". */
  defaultSlots: Record<AdSize, string>;
  placements: Record<string, { enabled: boolean; slotId: string }>;
  gamblingAds: boolean;
  adsterra: {
    scriptHost: string;
    defaultKeys: Record<AdSize, string>;
    placements: Record<string, string>;
    socialBarUrl: string;
    popunderUrl: string;
  };
};

export type AdsFormErrors = {
  clientId?: string;
  defaultSlots?: Partial<Record<AdSize, string>>;
  placements?: Record<string, string>;
  adsterra?: {
    scriptHost?: string;
    socialBarUrl?: string;
    popunderUrl?: string;
    defaultKeys?: Partial<Record<AdSize, string>>;
    placements?: Record<string, string>;
  };
};

export type AdPlacementRow = AdPlacement & { unregistered?: boolean };

const MODE_TITLES: Record<AdMode, string> = {
  off: 'Off',
  house: 'Placeholder',
  adsterra: 'Adsterra',
  adsense: 'Google AdSense',
};

const MODE_DESCRIPTIONS: Record<AdMode, string> = {
  off: 'No ad renders in any slot, on any page. Placement switches stay saved for later.',
  house: 'Show clean Advertisement placeholder cards sized to each slot (no external ad scripts).',
  adsterra: 'Serve live Adsterra banners, Social Bar & Popunder without needing AdSense approval.',
  adsense: 'Serve Google AdSense units. Requires an approved pub-… ID and numeric slot IDs.',
};

/**
 * Form state carries every placement in the registry plus any key the API already
 * holds that the registry does not know.
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
  const adsterraPlacements: Record<string, string> = {};

  for (const row of placementRowsFor(config)) {
    const stored = config.placements?.[row.key];
    placements[row.key] = {
      enabled: stored ? stored.enabled !== false : true,
      slotId: stored?.slotId ?? '',
    };
    adsterraPlacements[row.key] = config.adsterra?.placements?.[row.key] ?? '';
  }

  const defaultSlots = {} as Record<AdSize, string>;
  const defaultKeys = {} as Record<AdSize, string>;
  for (const size of AD_SIZES) {
    defaultSlots[size] = config.defaultSlots?.[size] ?? '';
    defaultKeys[size] = config.adsterra?.defaultKeys?.[size] ?? '';
  }

  return {
    mode: AD_MODES.includes(config.mode) ? config.mode : 'off',
    clientId: config.clientId ?? '',
    defaultSlots,
    placements,
    gamblingAds: config.gamblingAds === true,
    adsterra: {
      scriptHost: config.adsterra?.scriptHost || DEFAULT_ADSTERRA_HOST,
      defaultKeys,
      placements: adsterraPlacements,
      socialBarUrl: config.adsterra?.socialBarUrl ?? '',
      popunderUrl: config.adsterra?.popunderUrl ?? '',
    },
  };
}

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

  // Adsterra validation
  const adsterraErrors: NonNullable<AdsFormErrors['adsterra']> = {};
  const hostVal = state.adsterra.scriptHost.trim();
  if (hostVal && !isValidAdsterraHost(hostVal)) {
    adsterraErrors.scriptHost = 'Enter a valid domain like www.highperformanceformat.com';
  }
  const socialBar = state.adsterra.socialBarUrl.trim();
  if (socialBar && !isValidHttpsUrl(socialBar)) {
    adsterraErrors.socialBarUrl = 'Must be a valid https:// script URL from Adsterra.';
  }
  const popunder = state.adsterra.popunderUrl.trim();
  if (popunder && !isValidHttpsUrl(popunder)) {
    adsterraErrors.popunderUrl = 'Must be a valid https:// script URL from Adsterra.';
  }
  const defaultKeysErr: Partial<Record<AdSize, string>> = {};
  for (const size of AD_SIZES) {
    const val = state.adsterra.defaultKeys[size].trim();
    if (val && !isValidAdsterraKey(val)) {
      defaultKeysErr[size] = 'Paste the 32-char Adsterra key or the full <script> tag.';
    }
  }
  if (Object.keys(defaultKeysErr).length) adsterraErrors.defaultKeys = defaultKeysErr;

  const adsterraPlacementsErr: Record<string, string> = {};
  for (const [key, val] of Object.entries(state.adsterra.placements)) {
    const trimmed = val.trim();
    if (trimmed && !isValidAdsterraKey(trimmed)) {
      adsterraPlacementsErr[key] = 'Paste a valid 16–64 char Adsterra zone key.';
    }
  }
  if (Object.keys(adsterraPlacementsErr).length) adsterraErrors.placements = adsterraPlacementsErr;

  if (Object.keys(adsterraErrors).length) errors.adsterra = adsterraErrors;

  return errors;
}

export function toAdConfigInput(state: AdsFormState): AdConfigInput {
  const placements: AdConfigInput['placements'] = {};
  for (const [key, entry] of Object.entries(state.placements)) {
    placements[key] = { enabled: entry.enabled, slotId: entry.slotId.trim() };
  }

  const defaultSlots: Record<string, string> = {};
  for (const size of AD_SIZES) defaultSlots[size] = state.defaultSlots[size].trim();

  const defaultKeys: Record<string, string> = {};
  for (const size of AD_SIZES) defaultKeys[size] = state.adsterra.defaultKeys[size].trim();

  const adsterraPlacements: Record<string, string> = {};
  for (const [key, val] of Object.entries(state.adsterra.placements)) {
    adsterraPlacements[key] = val.trim();
  }

  const clientId = state.clientId.trim();

  return {
    mode: state.mode,
    ...(clientId ? { clientId } : {}),
    defaultSlots,
    placements,
    gamblingAds: state.gamblingAds,
    adsterra: {
      scriptHost: state.adsterra.scriptHost.trim() || DEFAULT_ADSTERRA_HOST,
      defaultKeys,
      placements: adsterraPlacements,
      socialBarUrl: state.adsterra.socialBarUrl.trim(),
      popunderUrl: state.adsterra.popunderUrl.trim(),
    },
  };
}

export function adsFormIsDirty(state: AdsFormState, savedConfig: AdConfig): boolean {
  return (
    canonicalAdConfigInput(toAdConfigInput(state)) !==
    canonicalAdConfigInput(toAdConfigInput(adsFormFromConfig(savedConfig)))
  );
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

export function enabledPlacementCount(state: AdsFormState): { on: number; total: number } {
  const rows = AD_PLACEMENTS as ReadonlyArray<AdPlacement>;
  return {
    on: rows.filter((row) => state.placements[row.key]?.enabled !== false).length,
    total: rows.length,
  };
}

export type PlacementSlotState = 'own' | 'inherited' | 'none';

export function placementSlotState(state: AdsFormState, key: string, size: AdSize): PlacementSlotState {
  if (state.mode === 'adsterra') {
    if (state.adsterra.placements[key]?.trim()) return 'own';
    if (state.adsterra.defaultKeys[size]?.trim()) return 'inherited';
    if (size === 'large-rectangle' && state.adsterra.defaultKeys['medium-rectangle']?.trim()) {
      return 'inherited';
    }
    return 'none';
  }
  if (state.placements[key]?.slotId.trim()) return 'own';
  return state.defaultSlots[size]?.trim() ? 'inherited' : 'none';
}

export function countSlotsWithoutAdUnit(state: AdsFormState): number {
  const rows = AD_PLACEMENTS as ReadonlyArray<AdPlacement>;
  return rows.filter((row) => {
    if (state.placements[row.key]?.enabled === false) return false;
    return placementSlotState(state, row.key, row.size) === 'none';
  }).length;
}

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

function extractScriptUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const match = trimmed.match(/src\s*=\s*['"](https:\/\/[^'"]+)['"]/i);
  return match?.[1] ?? trimmed;
}

function formatSyncTime(iso?: string | null): string {
  if (!iso) return 'Not saved yet (using defaults)';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

/* ─── Panel ─── */

export type AdConfigPanelProps = {
  config: AdConfig;
  updatedAt?: string | null;
  adUnits: AdSenseAdUnit[];
  includeArchived: boolean;
  onToggleArchived: () => void;
  adUnitsNotice?: ReactNode;
  onSaved: (_next: AdConfig) => void;
  onModeChange?: (_mode: AdMode) => void;
};

export default function AdConfigPanel({
  config,
  updatedAt,
  adUnits,
  includeArchived,
  onToggleArchived,
  adUnitsNotice,
  onSaved,
  onModeChange,
}: AdConfigPanelProps) {
  const [saved, setSaved] = useState<AdConfig>(config);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null | undefined>(updatedAt);
  const [state, setState] = useState<AdsFormState>(() => adsFormFromConfig(config));
  const [errors, setErrors] = useState<AdsFormErrors>({});
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('');
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [openOverrides, setOpenOverrides] = useState<Record<string, boolean>>({});
  const [unlockedFields, setUnlockedFields] = useState<Record<string, boolean>>({});
  const [defaultsOpen, setDefaultsOpen] = useState(() => config.mode === 'adsterra' || config.mode === 'adsense');

  const isFieldLocked = (fieldId: string, savedValue: string | null | undefined) =>
    Boolean(savedValue && savedValue.trim()) && !unlockedFields[fieldId];

  const toggleFieldLock = (fieldId: string) =>
    setUnlockedFields((prev) => ({ ...prev, [fieldId]: !prev[fieldId] }));

  const reconciledRef = useRef(JSON.stringify(config));
  useEffect(() => {
    const incoming = JSON.stringify(config);
    if (incoming === reconciledRef.current) return;
    reconciledRef.current = incoming;
    setSaved(config);
    setLastSyncedAt(updatedAt);
    setState(adsFormFromConfig(config));
    setErrors({});
  }, [config, updatedAt]);

  const rows = useMemo(() => placementRowsFor(saved), [saved]);
  const isAdsense = state.mode === 'adsense';
  const isAdsterra = state.mode === 'adsterra';
  const isOff = state.mode === 'off';

  const dirty = adsFormIsDirty(state, saved);
  const { on: enabledCount, total: totalPlacements } = enabledPlacementCount(state);
  const missingKeysOrUnits = isAdsense || isAdsterra ? countSlotsWithoutAdUnit(state) : 0;
  const readyPlacements = enabledCount - missingKeysOrUnits;

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

  const setAdsterraPlacementKey = (key: string, raw: string) => {
    const parsed = parseAdsterraInput(raw);
    setState((prev) => ({
      ...prev,
      adsterra: {
        ...prev.adsterra,
        ...(parsed.host ? { scriptHost: parsed.host } : {}),
        placements: { ...prev.adsterra.placements, [key]: parsed.key },
      },
    }));
  };

  const setAdsterraDefaultKey = (size: AdSize, raw: string) => {
    const parsed = parseAdsterraInput(raw);
    setState((prev) => ({
      ...prev,
      adsterra: {
        ...prev.adsterra,
        ...(parsed.host ? { scriptHost: parsed.host } : {}),
        defaultKeys: { ...prev.adsterra.defaultKeys, [size]: parsed.key },
      },
    }));
  };

  const handleModeSelect = (mode: AdMode) => {
    setState((prev) => ({ ...prev, mode }));
    if (mode === 'adsterra' || mode === 'adsense') {
      setDefaultsOpen(true);
    }
    onModeChange?.(mode);
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
      const next = result.ads;
      reconciledRef.current = JSON.stringify(next);
      setSaved(next);
      setLastSyncedAt(result.updatedAt);
      setState(adsFormFromConfig(next));
      setUnlockedFields({});
      setErrors({});
      onSaved(next);
      toast.success('Ad configuration saved to database.');
    } catch {
      toast.error('Could not save the ad configuration.');
    } finally {
      setSaving(false);
    }
  };

  const onDiscard = () => {
    setState(adsFormFromConfig(saved));
    setUnlockedFields({});
    setErrors({});
    onModeChange?.(saved.mode);
  };

  return (
    <form onSubmit={onSave} noValidate className="space-y-5">
      {/* ── Live Sync & Overview Bar ── */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3 text-xs"
        style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-card)' }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-semibold" style={{ color: 'var(--admin-text)' }}>
            <Database size={14} aria-hidden style={{ color: 'var(--admin-accent)' }} />
            Synced with backend database
          </span>
          <Badge tone={dirty ? 'warning' : 'success'}>
            {dirty ? 'Unsaved changes' : 'In sync'}
          </Badge>
          <span style={{ color: 'var(--admin-text-muted)' }}>
            Last saved: <span className="font-medium">{formatSyncTime(lastSyncedAt)}</span>
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent">Active: {MODE_TITLES[state.mode]}</Badge>
          <Badge tone="neutral">
            {isOff ? '0 active' : `${readyPlacements}/${totalPlacements} ready`}
          </Badge>
        </div>
      </div>

      {/* ── Delivery / Publisher Network ── */}
      <Panel>
        <PanelHeading
          title="1. Ad Network & Delivery Mode"
          hint="Choose which ad publisher runs on the public site. Only one network is active at a time."
        />

        <div role="radiogroup" aria-label="Advertisement delivery mode" className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-4">
          {AD_MODES.map((mode) => {
            const selected = state.mode === mode;
            return (
              <label
                key={mode}
                className="flex cursor-pointer flex-col gap-1.5 rounded-md p-3 text-xs transition-colors"
                style={{
                  border: `1px solid ${selected ? 'var(--admin-accent)' : 'var(--admin-border)'}`,
                  background: selected ? 'var(--admin-info-bg)' : 'var(--admin-input-bg)',
                }}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="ads-mode"
                      value={mode}
                      checked={selected}
                      onChange={() => handleModeSelect(mode)}
                    />
                    <span className="text-sm font-semibold" style={{ color: 'var(--admin-text)' }}>
                      {MODE_TITLES[mode]}
                    </span>
                  </span>
                  {selected ? <Badge tone="accent">Selected</Badge> : null}
                </span>
                <span className="leading-relaxed" style={{ color: 'var(--admin-text-muted)' }}>
                  {MODE_DESCRIPTIONS[mode]}
                </span>
              </label>
            );
          })}
        </div>

        {isOff ? (
          <Callout tone="info" icon={<Info size={14} aria-hidden />}>
            Ads are off, so no slot will render regardless of the switches below. They stay editable
            so you can set the site up before switching on.
          </Callout>
        ) : null}

        {(isAdsense || isAdsterra) && missingKeysOrUnits > 0 ? (
          <Callout tone="warning" icon={<AlertTriangle size={14} aria-hidden />}>
            {isAdsterra
              ? `${missingKeysOrUnits} of ${enabledCount} placements have no Adsterra zone key yet and will stay hidden. Set a default key per size below.`
              : `${missingKeysOrUnits} of ${enabledCount} placements have no ad unit id and will render nothing. Give them an id below, or set a default for their size.`}
          </Callout>
        ) : null}

        {(isAdsense || isAdsterra) && enabledCount > 0 && missingKeysOrUnits === 0 ? (
          <Callout tone="success" icon={<CheckCircle2 size={14} aria-hidden />}>
            All {enabledCount} enabled placements have a valid {isAdsterra ? 'Adsterra key' : 'AdSense unit ID'} configured.
          </Callout>
        ) : null}
      </Panel>

      {/* ── Adsterra Configuration ── */}
      {isAdsterra ? (
        <Panel>
          <PanelHeading
            title="2. Adsterra Setup"
            hint="Paste your Adsterra zone keys (or paste the full <script> snippet — the key and host are extracted automatically)."
          />

          <div className="grid gap-4 lg:grid-cols-3">
            <AdminField
              label="Banner script host"
              htmlFor="adsterra-script-host"
              hint={`Default: ${DEFAULT_ADSTERRA_HOST}. Change only if Adsterra gives you a custom anti-adblock domain.`}
            >
              <LockableFieldRow
                locked={isFieldLocked('adsterra-script-host', saved.adsterra?.scriptHost)}
                hasSaved={Boolean(saved.adsterra?.scriptHost)}
                onToggleLock={() => toggleFieldLock('adsterra-script-host')}
              >
                <AdminInput
                  id="adsterra-script-host"
                  value={state.adsterra.scriptHost}
                  readOnly={isFieldLocked('adsterra-script-host', saved.adsterra?.scriptHost)}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      adsterra: { ...prev.adsterra, scriptHost: e.target.value },
                    }))
                  }
                  placeholder={DEFAULT_ADSTERRA_HOST}
                  style={{
                    ...(isFieldLocked('adsterra-script-host', saved.adsterra?.scriptHost)
                      ? { opacity: 0.75, cursor: 'not-allowed' }
                      : {}),
                    ...(errors.adsterra?.scriptHost ? { borderColor: 'var(--admin-danger)' } : {}),
                  }}
                />
              </LockableFieldRow>
              {errors.adsterra?.scriptHost ? (
                <p className="mt-1.5 text-[11px] font-medium" style={{ color: 'var(--admin-danger)' }}>
                  {errors.adsterra.scriptHost}
                </p>
              ) : null}
            </AdminField>

            <AdminField
              label="Social Bar script URL (optional)"
              htmlFor="adsterra-social-bar"
              hint="Paste the https://.../invoke.js URL (or full <script> tag) from your Adsterra Social Bar unit."
            >
              <LockableFieldRow
                locked={isFieldLocked('adsterra-social-bar', saved.adsterra?.socialBarUrl)}
                hasSaved={Boolean(saved.adsterra?.socialBarUrl)}
                onToggleLock={() => toggleFieldLock('adsterra-social-bar')}
              >
                <AdminInput
                  id="adsterra-social-bar"
                  value={state.adsterra.socialBarUrl}
                  readOnly={isFieldLocked('adsterra-social-bar', saved.adsterra?.socialBarUrl)}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      adsterra: { ...prev.adsterra, socialBarUrl: extractScriptUrl(e.target.value) },
                    }))
                  }
                  placeholder="https://pl12345678.effectivegatecpm.com/.../invoke.js"
                  style={{
                    ...(isFieldLocked('adsterra-social-bar', saved.adsterra?.socialBarUrl)
                      ? { opacity: 0.75, cursor: 'not-allowed' }
                      : {}),
                    ...(errors.adsterra?.socialBarUrl ? { borderColor: 'var(--admin-danger)' } : {}),
                  }}
                />
              </LockableFieldRow>
              {errors.adsterra?.socialBarUrl ? (
                <p className="mt-1.5 text-[11px] font-medium" style={{ color: 'var(--admin-danger)' }}>
                  {errors.adsterra.socialBarUrl}
                </p>
              ) : null}
            </AdminField>

            <AdminField
              label="Popunder script URL (optional)"
              htmlFor="adsterra-popunder"
              hint="Optional global popunder script URL (or full <script> tag). Leave blank to disable."
            >
              <LockableFieldRow
                locked={isFieldLocked('adsterra-popunder', saved.adsterra?.popunderUrl)}
                hasSaved={Boolean(saved.adsterra?.popunderUrl)}
                onToggleLock={() => toggleFieldLock('adsterra-popunder')}
              >
                <AdminInput
                  id="adsterra-popunder"
                  value={state.adsterra.popunderUrl}
                  readOnly={isFieldLocked('adsterra-popunder', saved.adsterra?.popunderUrl)}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      adsterra: { ...prev.adsterra, popunderUrl: extractScriptUrl(e.target.value) },
                    }))
                  }
                  placeholder="https://pl12345678.effectivegatecpm.com/.../invoke.js"
                  style={{
                    ...(isFieldLocked('adsterra-popunder', saved.adsterra?.popunderUrl)
                      ? { opacity: 0.75, cursor: 'not-allowed' }
                      : {}),
                    ...(errors.adsterra?.popunderUrl ? { borderColor: 'var(--admin-danger)' } : {}),
                  }}
                />
              </LockableFieldRow>
              {errors.adsterra?.popunderUrl ? (
                <p className="mt-1.5 text-[11px] font-medium" style={{ color: 'var(--admin-danger)' }}>
                  {errors.adsterra.popunderUrl}
                </p>
              ) : null}
            </AdminField>
          </div>
        </Panel>
      ) : null}

      {/* ── Google AdSense Publisher ID (only in AdSense mode) ── */}
      {isAdsense ? (
        <Panel>
          <PanelHeading
            title="2. Google AdSense Credentials"
            hint="Enter your approved AdSense publisher ID and map your AdSense unit IDs below."
          />
          <div className="max-w-lg">
            <AdminField
              label="AdSense publisher id"
              htmlFor="ads-client-id"
              hint="Paste it straight from the AdSense dashboard. The ca- prefix is optional and is stripped on save."
            >
              <LockableFieldRow
                locked={isFieldLocked('ads-client-id', saved.clientId)}
                hasSaved={Boolean(saved.clientId)}
                onToggleLock={() => toggleFieldLock('ads-client-id')}
              >
                <AdminInput
                  id="ads-client-id"
                  value={state.clientId}
                  readOnly={isFieldLocked('ads-client-id', saved.clientId)}
                  aria-invalid={Boolean(errors.clientId) || undefined}
                  onChange={(event) => setState((prev) => ({ ...prev, clientId: event.target.value }))}
                  placeholder="pub-1234567890123456"
                  style={{
                    ...(isFieldLocked('ads-client-id', saved.clientId)
                      ? { opacity: 0.75, cursor: 'not-allowed' }
                      : {}),
                    ...(errors.clientId ? { borderColor: 'var(--admin-danger)' } : {}),
                  }}
                />
              </LockableFieldRow>
            </AdminField>

            {errors.clientId ? (
              <p className="mt-2 text-[11px] font-medium" style={{ color: 'var(--admin-danger)' }}>
                {errors.clientId}
              </p>
            ) : null}

            {saved.clientId && !state.clientId.trim() ? (
              <p className="mt-2 text-[11px] font-medium" style={{ color: 'var(--admin-warning, var(--color-warning))' }}>
                Clearing this box will not remove the stored publisher id — switch mode to Off or Adsterra instead.
              </p>
            ) : null}
          </div>
        </Panel>
      ) : null}

      {/* ── Confirmed Ad Sizes & Defaults ── */}
      {(isAdsterra || isAdsense) ? (
        <Panel>
          <PanelHeading
            title={isAdsterra ? '3. Confirmed Ad Sizes — Default Adsterra Keys' : '3. Confirmed Ad Sizes — Default AdSense Units'}
            hint="Assign one key/unit per confirmed pixel size. Every placement matching that size inherits it automatically unless overridden below."
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

          {isAdsense ? (
            <>
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
            </>
          ) : null}

          {defaultsOpen ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(isAdsterra ? ADSTERRA_SIZES : AD_SIZES).map((size) => {
                const count =
                  isAdsterra && size === 'medium-rectangle'
                    ? CONFIRMED_SIZE_USAGE_COUNT['medium-rectangle'] + CONFIRMED_SIZE_USAGE_COUNT['large-rectangle']
                    : CONFIRMED_SIZE_USAGE_COUNT[size];
                const confirmedDims = CONFIRMED_SIZE_BADGE[size];
                const adsterraMeta = isAdsterra ? ADSTERRA_SIZE_META[size] : undefined;
                return (
                  <div
                    key={size}
                    className="rounded-md p-3"
                    style={{ border: '1px solid var(--admin-border)', background: 'var(--admin-input-bg)' }}
                  >
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
                        {adsterraMeta ? adsterraMeta.unitName : AD_SIZE_LABELS[size].label}
                        {adsterraMeta ? (
                          <Badge tone={adsterraMeta.tag === 'Recommended' ? 'accent' : 'neutral'}>
                            {adsterraMeta.tag}
                          </Badge>
                        ) : null}
                      </span>
                      <div className="flex items-center gap-1.5">
                        {isAdsterra && isValidAdsterraKey(state.adsterra.defaultKeys[size]) ? (
                          <Badge tone="success">Ready</Badge>
                        ) : null}
                        <Badge tone="neutral">{confirmedDims}</Badge>
                        <Badge tone="neutral">{count} slot{count === 1 ? '' : 's'}</Badge>
                      </div>
                    </div>
                    <p className="mb-2 text-[11px]" style={{ color: 'var(--admin-text-muted)' }}>
                      {adsterraMeta ? adsterraMeta.hint : AD_SIZE_LABELS[size].hint}
                    </p>

                    {isAdsterra ? (
                      <>
                        <LockableFieldRow
                          locked={isFieldLocked(`adsterra-default-${size}`, saved.adsterra?.defaultKeys?.[size])}
                          hasSaved={Boolean(saved.adsterra?.defaultKeys?.[size])}
                          onToggleLock={() => toggleFieldLock(`adsterra-default-${size}`)}
                        >
                          <AdminInput
                            id={`ads-default-${size}`}
                            value={state.adsterra.defaultKeys[size]}
                            readOnly={isFieldLocked(`adsterra-default-${size}`, saved.adsterra?.defaultKeys?.[size])}
                            onChange={(e) => setAdsterraDefaultKey(size, e.target.value)}
                            placeholder="Paste 32-char Adsterra key or <script>..."
                            style={{
                              ...(isFieldLocked(`adsterra-default-${size}`, saved.adsterra?.defaultKeys?.[size])
                                ? { opacity: 0.75, cursor: 'not-allowed' }
                                : {}),
                              ...(errors.adsterra?.defaultKeys?.[size]
                                ? { borderColor: 'var(--admin-danger)' }
                                : {}),
                            }}
                          />
                        </LockableFieldRow>
                        {errors.adsterra?.defaultKeys?.[size] ? (
                          <span className="mt-1.5 block text-[11px] font-medium" style={{ color: 'var(--admin-danger)' }}>
                            {errors.adsterra.defaultKeys[size]}
                          </span>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <AdSlotPicker
                          id={`ads-default-${size}`}
                          value={state.defaultSlots[size] || null}
                          adUnits={adUnits}
                          invalid={Boolean(errors.defaultSlots?.[size])}
                          onChange={(value) =>
                            setState((prev) => ({
                              ...prev,
                              defaultSlots: { ...prev.defaultSlots, [size]: value ?? '' },
                            }))
                          }
                        />
                        {errors.defaultSlots?.[size] ? (
                          <span className="mt-1.5 block text-[11px] font-medium" style={{ color: 'var(--admin-danger)' }}>
                            {errors.defaultSlots[size]}
                          </span>
                        ) : null}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          ) : null}
        </Panel>
      ) : null}

      {/* ── Placements ── */}
      <Panel>
        <PanelHeading
          title={isAdsterra || isAdsense ? '4. Page Placements' : '2. Page Placements'}
          hint={`${enabledCount} of ${totalPlacements} placements enabled across the site.`}
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

                  <AdminToggle
                    checked={groupOn > 0}
                    label={`Toggle all placements in ${group.label}`}
                    onChange={() => setState((prev) => setPlacementGroupEnabled(prev, keys, groupOn === 0))}
                  />
                </div>

                <div hidden={!open} className="border-t px-3 py-2" style={{ borderColor: 'var(--admin-border)' }}>
                  <ul className="divide-y" style={{ borderColor: 'var(--admin-border)' }}>
                    {group.rows.map((row) => (
                      <PlacementRow
                        key={row.key}
                        mode={state.mode}
                        row={row}
                        entry={state.placements[row.key] ?? { enabled: true, slotId: '' }}
                        adsterraKey={state.adsterra.placements[row.key] ?? ''}
                        slotState={placementSlotState(state, row.key, row.size)}
                        overrideOpen={Boolean(openOverrides[row.key])}
                        onToggleOverride={() =>
                          setOpenOverrides((prev) => ({ ...prev, [row.key]: !prev[row.key] }))
                        }
                        error={
                          isAdsterra
                            ? errors.adsterra?.placements?.[row.key]
                            : errors.placements?.[row.key]
                        }
                        adUnits={adUnits}
                        onToggleEnabled={() =>
                          setPlacement(row.key, { enabled: state.placements[row.key]?.enabled === false })
                        }
                        onChangeSlotId={(slotId) => setPlacement(row.key, { slotId: slotId ?? '' })}
                        onChangeAdsterraKey={(val) => setAdsterraPlacementKey(row.key, val)}
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
          {dirty ? 'Unsaved changes.' : 'Saved.'} Public pages update within 60 seconds.
        </p>
      </div>
    </form>
  );
}

/* ─── Row ─── */

function PlacementRow({
  mode,
  row,
  entry,
  adsterraKey,
  slotState,
  overrideOpen,
  onToggleOverride,
  error,
  adUnits,
  onToggleEnabled,
  onChangeSlotId,
  onChangeAdsterraKey,
}: {
  mode: AdMode;
  row: AdPlacementRow;
  entry: { enabled: boolean; slotId: string };
  adsterraKey: string;
  slotState: PlacementSlotState;
  overrideOpen: boolean;
  onToggleOverride: () => void;
  error?: string;
  adUnits: AdSenseAdUnit[];
  onToggleEnabled: () => void;
  onChangeSlotId: (_slotId: string | null) => void;
  onChangeAdsterraKey: (_value: string) => void;
}) {
  const enabled = entry.enabled !== false;
  const sizeLabel = AD_SIZE_LABELS[row.size];
  const confirmedDims = CONFIRMED_SIZE_BADGE[row.size];
  const showUnitInputs = mode === 'adsense' || mode === 'adsterra';
  const hasCustomValue = mode === 'adsterra' ? Boolean(adsterraKey.trim()) : Boolean(entry.slotId.trim());
  const showOverrideBox = showUnitInputs && (overrideOpen || hasCustomValue || Boolean(error));

  return (
    <li className="flex flex-col gap-2 py-2.5">
      <div className="flex flex-wrap items-center gap-3 sm:flex-nowrap">
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
            {showUnitInputs && enabled && slotState === 'none' ? (
              <Badge tone="warning">{mode === 'adsterra' ? 'no key' : 'no ad unit'}</Badge>
            ) : null}
            {showUnitInputs && enabled && slotState === 'inherited' ? (
              <Badge tone="neutral">size default</Badge>
            ) : null}
            {showUnitInputs && enabled && slotState === 'own' ? (
              <Badge tone="success">custom</Badge>
            ) : null}
          </div>
          <span className="block truncate font-mono text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
            {row.key}
            {row.unregistered ? ' · not in the registry, renders nowhere' : ''}
          </span>
        </div>

        <span
          className="shrink-0 text-right text-[11px]"
          style={{ color: 'var(--admin-text-secondary)' }}
          title={`${sizeLabel.label} · ${confirmedDims}`}
        >
          <span className="font-medium">{sizeLabel.label}</span>
          <span className="ml-1.5 font-mono text-[10px]" style={{ color: 'var(--admin-text-muted)' }}>
            ({confirmedDims})
          </span>
        </span>

        {showUnitInputs && !showOverrideBox ? (
          <button
            type="button"
            disabled={!enabled}
            onClick={onToggleOverride}
            className="shrink-0 rounded px-2 py-1 text-[10px] font-semibold disabled:opacity-40"
            style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }}
          >
            Override
          </button>
        ) : null}
      </div>

      {showOverrideBox ? (
        <div className="pl-11">
          {mode === 'adsterra' ? (
            <div className="flex items-center gap-2">
              <AdminInput
                id={`ads-placement-${row.key}`}
                value={adsterraKey}
                disabled={!enabled}
                placeholder="Custom Adsterra key or <script>..."
                onChange={(e) => onChangeAdsterraKey(e.target.value)}
                style={error ? { borderColor: 'var(--admin-danger)' } : undefined}
              />
              {!hasCustomValue ? (
                <button
                  type="button"
                  onClick={onToggleOverride}
                  className="shrink-0 text-[11px]"
                  style={{ color: 'var(--admin-text-muted)' }}
                >
                  Cancel
                </button>
              ) : null}
            </div>
          ) : (
            <AdSlotPicker
              id={`ads-placement-${row.key}`}
              value={entry.slotId || null}
              adUnits={adUnits}
              invalid={Boolean(error)}
              disabled={!enabled}
              onChange={onChangeSlotId}
            />
          )}
          {error ? (
            <span className="mt-1.5 block text-[11px] font-medium" style={{ color: 'var(--admin-danger)' }}>
              {error}
            </span>
          ) : null}
        </div>
      ) : null}
    </li>
  );
}

/* ─── Small parts ─── */

function LockableFieldRow({
  locked,
  hasSaved,
  onToggleLock,
  children,
}: {
  locked: boolean;
  hasSaved: boolean;
  onToggleLock: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="min-w-0 flex-1">{children}</div>
      {hasSaved ? (
        <button
          type="button"
          onClick={onToggleLock}
          className="inline-flex shrink-0 items-center gap-1 rounded-md px-2.5 py-2 text-[11px] font-semibold transition-colors"
          style={{
            border: `1px solid ${locked ? 'var(--admin-border)' : 'var(--admin-accent)'}`,
            color: locked ? 'var(--admin-text-secondary)' : 'var(--admin-accent)',
            background: 'var(--admin-card)',
          }}
        >
          {locked ? (
            <>
              <Pencil size={12} aria-hidden />
              Edit
            </>
          ) : (
            <>
              <Lock size={12} aria-hidden />
              Lock
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}

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
  tone: 'info' | 'warning' | 'success';
  icon: ReactNode;
  children: ReactNode;
}) {
  const color =
    tone === 'warning'
      ? 'var(--admin-warning, var(--color-warning))'
      : tone === 'success'
        ? 'var(--admin-success)'
        : 'var(--admin-text-secondary)';
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
