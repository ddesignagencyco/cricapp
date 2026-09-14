'use client';

import { Eye, EyeOff, Lock } from 'lucide-react';
import { useState, type CSSProperties } from 'react';

interface PasswordFieldProps {
  id: string;
  label: string;
  name: string;
  value: string;
  onChange: (_value: string) => void;
  autoComplete: 'current-password' | 'new-password';
  error?: string;
}

export default function PasswordField({ id, label, name, value, onChange, autoComplete, error }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const errorId = `${id}-error`;

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-stext">
        {label}
      </label>
      <div className="relative">
        <Lock size={16} className="pointer-events-none absolute left-3.5 top-1/2 z-10 -translate-y-1/2 text-stext" />
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          spellCheck={false}
          minLength={6}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          style={visible ? ({ WebkitTextSecurity: 'none' } as CSSProperties) : undefined}
          className="auth-password-input w-full rounded-2xl border border-lborder bg-input py-3 pl-10 pr-12 text-sm text-mtext outline-none transition-colors placeholder:text-stext/70 focus:border-[var(--color-focus-ring)] focus:bg-card focus:ring-2 focus:ring-[var(--color-focus-ring)]/30"
        />
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 z-20 flex w-11 items-center justify-center rounded text-stext transition-colors hover:text-mtext focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {error && <p id={errorId} className="text-xs font-semibold text-danger">{error}</p>}
    </div>
  );
}
