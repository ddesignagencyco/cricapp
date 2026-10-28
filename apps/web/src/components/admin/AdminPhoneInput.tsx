'use client';

import { forwardRef, memo, useMemo, type InputHTMLAttributes } from 'react';
import PhoneInput, { getCountryCallingCode, type Country } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
import { AdminInput } from './AdminShared';
import SiteSelect, { type SelectOption } from '../ui/SiteSelect';

/** The package's text input, rendered as the admin input so it matches the form. */
const PhoneTextInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>((props, ref) => (
  <AdminInput ref={ref} {...props} />
));
PhoneTextInput.displayName = 'PhoneTextInput';

type CountrySelectProps = {
  value?: Country;
  onChange: (_value?: Country) => void;
  options: Array<{ value?: Country; label: string; divider?: boolean }>;
  disabled?: boolean;
  readOnly?: boolean;
  'aria-label'?: string;
};

/**
 * Country picker for the phone field, as the site's react-select instead of the
 * package's native <select>. The ~245 options are built once per list (memo), and
 * each shows its calling code so "+92 Pakistan" is searchable by name or code.
 */
const PhoneCountrySelect = memo(function PhoneCountrySelect({
  value,
  onChange,
  options,
  disabled,
  readOnly,
  'aria-label': ariaLabel,
}: CountrySelectProps) {
  const list = useMemo<SelectOption[]>(
    () =>
      options
        .filter((o): o is { value: Country; label: string } => Boolean(o.value) && !o.divider)
        .map((o) => ({ value: o.value, label: `+${getCountryCallingCode(o.value)} ${o.label}` })),
    [options],
  );
  return (
    <div className="w-[9.5rem] shrink-0">
      <SiteSelect
        variant="admin"
        value={value ?? ''}
        options={list}
        onValueChange={(next) => onChange((next || undefined) as Country | undefined)}
        disabled={disabled || readOnly}
        isSearchable
        aria-label={ariaLabel ?? 'Phone country'}
      />
    </div>
  );
});

/**
 * Phone field (react-phone-number-input): formats as you type by the chosen
 * country's own numbering plan and stops at that country's maximum length, so a
 * number is never forced into one pattern or left to grow without limit.
 * `value` and `onChange` use E.164 ("+923001234567"); '' when empty.
 */
export default function AdminPhoneInput({
  id,
  value,
  onChange,
  onBlur,
  defaultCountry,
  invalid,
  describedBy,
  placeholder,
}: {
  id?: string;
  value: string;
  onChange: (_e164: string) => void;
  onBlur?: (_e164: string) => void;
  /** ISO 3166-1 alpha-2 code of the site's country, e.g. "PK". */
  defaultCountry?: string;
  invalid?: boolean;
  describedBy?: string;
  placeholder?: string;
}) {
  return (
    <PhoneInput
      id={id}
      international
      countryCallingCodeEditable={false}
      limitMaxLength
      defaultCountry={(defaultCountry || 'PK') as Country}
      countrySelectComponent={PhoneCountrySelect}
      value={value || undefined}
      onChange={(next) => onChange(next ?? '')}
      onBlur={() => onBlur?.(value)}
      inputComponent={PhoneTextInput}
      placeholder={placeholder}
      aria-invalid={invalid || undefined}
      aria-describedby={describedBy}
      className={`admin-phone-input${invalid ? ' is-invalid' : ''}`}
    />
  );
}
