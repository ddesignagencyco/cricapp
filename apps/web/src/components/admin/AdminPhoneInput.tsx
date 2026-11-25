'use client';

import { AdminInput } from './AdminShared';

const PK_MAX_DIGITS = 10;

/**
 * Extracts up to 10 national Pakistan digits from E.164 or pasted input
 * (strips "+92", "0092", "92", or a leading "0").
 */
function extractPakistanDigits(raw: string): string {
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('0092')) digits = digits.slice(4);
  else if (digits.startsWith('92') && digits.length > 2) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits.slice(0, PK_MAX_DIGITS);
}

/** Formats 10 national Pakistan digits as "300 1234567". */
function formatPakistanLocal(digits: string): string {
  if (!digits) return '';
  if (digits.length <= 3) return digits;
  return `${digits.slice(0, 3)} ${digits.slice(3)}`;
}

/**
 * Pakistan-only phone field (+92 fixed, no country dropdown).
 * Hard-caps national digits at 10 ("300 1234567") and stores E.164 ("+923001234567")
 * or '' when empty.
 */
export default function AdminPhoneInput({
  id,
  value,
  onChange,
  onBlur,
  invalid,
  describedBy,
  placeholder,
}: {
  id?: string;
  value: string;
  onChange: (_e164: string) => void;
  onBlur?: (_e164: string) => void;
  /** Kept for backwards-compatibility with callers; Pakistan (+92) is always enforced. */
  defaultCountry?: string;
  invalid?: boolean;
  describedBy?: string;
  placeholder?: string;
}) {
  const localDigits = extractPakistanDigits(value || '');
  const displayValue = formatPakistanLocal(localDigits);

  const handleChange = (raw: string) => {
    const digits = extractPakistanDigits(raw);
    onChange(digits ? `+92${digits}` : '');
  };

  return (
    <div className={`admin-phone-input flex items-center gap-0${invalid ? ' is-invalid' : ''}`}>
      <span
        className="inline-flex h-[38px] shrink-0 select-none items-center rounded-l-md px-3 text-xs font-bold"
        style={{
          background: 'var(--admin-surface)',
          border: `1px solid ${invalid ? 'var(--admin-danger)' : 'var(--admin-border)'}`,
          borderRight: 'none',
          color: 'var(--admin-text-secondary)',
        }}
        aria-hidden
      >
        +92
      </span>
      <AdminInput
        id={id}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        value={displayValue}
        maxLength={11}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => onBlur?.(localDigits ? `+92${localDigits}` : '')}
        placeholder={placeholder || '300 1234567'}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="rounded-l-none"
        style={
          invalid
            ? {
                borderColor: 'var(--admin-danger)',
                boxShadow: '0 0 0 3px color-mix(in srgb, var(--admin-danger) 14%, transparent)',
              }
            : undefined
        }
      />
    </div>
  );
}
