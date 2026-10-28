'use client';

import { useEffect, useState } from 'react';
import CreatableSelect from 'react-select/creatable';

type Option = { value: string; label: string };

/** Cities per country code, kept for the session: the data is several MB. */
const cache = new Map<string, Option[]>();

/**
 * City picker for the selected country (country-state-city). The data is imported
 * on demand, so it only loads on the admin settings page, never in the public site.
 * A city that is missing from the list can still be typed in.
 */
export default function AdminCitySelect({
  inputId,
  countryCode,
  value,
  onChange,
  onBlur,
  invalid,
  describedBy,
  styles,
}: {
  inputId: string;
  countryCode?: string;
  value: string;
  onChange: (_city: string) => void;
  onBlur?: () => void;
  invalid?: boolean;
  describedBy?: string;
  styles: unknown;
}) {
  const [options, setOptions] = useState<Option[]>(() => (countryCode && cache.get(countryCode)) || []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!countryCode) {
      setOptions([]);
      return;
    }
    const cached = cache.get(countryCode);
    if (cached) {
      setOptions(cached);
      return;
    }
    let live = true;
    setLoading(true);
    import('country-state-city')
      .then(({ City }) => {
        // The list repeats a name once per state; one entry per name is enough here.
        const names = [...new Set((City.getCitiesOfCountry(countryCode) ?? []).map((c) => c.name))].sort((a, b) =>
          a.localeCompare(b),
        );
        const next = names.map((name) => ({ value: name, label: name }));
        cache.set(countryCode, next);
        if (live) setOptions(next);
      })
      .catch(() => {
        if (live) setOptions([]);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [countryCode]);

  const selected = value ? options.find((o) => o.value === value) ?? { value, label: value } : null;

  return (
    <CreatableSelect<Option, false>
      instanceId={inputId}
      inputId={inputId}
      value={selected}
      options={options}
      isLoading={loading}
      isClearable
      isDisabled={!countryCode}
      placeholder={countryCode ? 'Search or type a city' : 'Select a country first'}
      formatCreateLabel={(text) => `Use “${text}”`}
      noOptionsMessage={() => (loading ? 'Loading cities…' : 'Type the city name')}
      onChange={(option) => onChange(option?.value ?? '')}
      onBlur={onBlur}
      classNamePrefix="react-select"
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      styles={styles as never}
    />
  );
}
