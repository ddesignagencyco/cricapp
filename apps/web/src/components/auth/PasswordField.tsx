'use client';

import { Eye, EyeOff, Lock } from 'lucide-react';
import { useState } from 'react';

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
    <div>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold text-mtext">{label}</label>
      <div className="relative">
        <Lock size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stext" />
        <input
          id={id}
          name={name}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          minLength={6}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="w-full rounded bg-elevated py-2.5 pl-9 pr-10 text-sm text-mtext ring-1 ring-lborder outline-none transition focus:ring-2 focus:ring-accent/60"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-stext hover:text-mtext focus:outline-none focus:ring-2 focus:ring-accent/60"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff size={15} /> : <Eye size={15} />}
        </button>
      </div>
      {error && <p id={errorId} className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
