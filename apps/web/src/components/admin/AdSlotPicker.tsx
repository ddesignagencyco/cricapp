'use client';

import { useMemo } from 'react';
import { AdminInput, AdminSelect } from './AdminShared';
import {
  adUnitOptionLabel,
  groupAdUnitsBySuggestedSize,
  type AdSenseAdUnit,
} from '../../services/adsense';
import { isValidAdUnitId } from '../../lib/advertisements/registry';

export type AdSlotPickerProps = {
  id: string;
  value: string | null;
  onChange: (_value: string | null) => void;
  /** Numeric ad unit ids from `GET /admin/adsense/ad-units`. */
  adUnits: AdSenseAdUnit[];
  placeholder?: string;
  invalid?: boolean;
  disabled?: boolean;
};

/**
 * Picks an ad unit for a placement.
 *
 * The list is fed by the AdSense Management API, but the box stays editable: the
 * API only validates `slotId` by normalising it, so an id that is not in the
 * account's unit list is still legitimate (a unit created after this page loaded,
 * or an AFC unit the API cannot see).
 *
 * Uses `slotId`, never `reportingDimensionId` — the latter is the `ca-pub-…:…`
 * form, which normalisation rejects and drops to `null`.
 */
export default function AdSlotPicker({
  id,
  value,
  onChange,
  adUnits,
  placeholder = 'No ad unit — inherit the size default',
  invalid = false,
  disabled = false,
}: AdSlotPickerProps) {
  const groups = useMemo(() => groupAdUnitsBySuggestedSize(adUnits), [adUnits]);

  // An id that is stored but absent from the fetched list still has to show, or the
  // select would silently display "none" while the API holds a real value.
  const known = value === null || adUnits.some((unit) => unit.slotId === value);

  return (
    <div className="flex min-w-0 items-center gap-2">
      <AdminSelect
        id={id}
        value={value ?? ''}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value || null)}
        style={invalid ? { borderColor: 'var(--admin-danger)' } : undefined}
      >
        <option value="">{placeholder}</option>
        {value && !known ? (
          <option value={value}>{value} (not in the fetched list)</option>
        ) : null}
        {groups.map((group) => (
          <optgroup key={group.suggestedSize} label={group.label}>
            {group.adUnits.map((unit) => (
              <option key={unit.resourceName} value={unit.slotId ?? ''}>
                {adUnitOptionLabel(unit)}
              </option>
            ))}
          </optgroup>
        ))}
      </AdminSelect>
      <AdminInput
        type="text"
        inputMode="numeric"
        aria-label="Ad unit id"
        aria-invalid={invalid || undefined}
        placeholder="Enter id"
        disabled={disabled}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value.trim() || null)}
        style={{ width: '9.5rem', flexShrink: 0, ...(invalid ? { borderColor: 'var(--admin-danger)' } : {}) }}
      />
    </div>
  );
}

/**
 * The API does not validate slot ids — `defaultSlots` and `placements` are
 * `Record<string, …>` without `@ValidateNested`, so a typo returns 200 with the
 * value silently normalised to `null`. The form has to catch it, or the admin sees
 * a successful save and an empty slot with no error anywhere.
 */
export function validateSlotIdInput(value: string | null): string | null {
  if (value === null || value.trim() === '') return null;
  if (!isValidAdUnitId(value)) {
    return 'Must be 10–20 digits, e.g. 1234567890.';
  }
  return null;
}