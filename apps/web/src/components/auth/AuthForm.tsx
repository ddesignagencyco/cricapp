'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Mail, Lock, User, CheckCircle2 } from 'lucide-react';

type Mode = 'signin' | 'signup' | 'forgot' | 'reset' | 'verify';

interface AuthFormProps {
  mode: Mode;
}

const copy: Record<Mode, { successTitle: string; successBody: string; submit: string }> = {
  signin: {
    successTitle: 'Welcome back',
    successBody: 'You are signed in. Redirecting you to the homepage.',
    submit: 'Sign in',
  },
  signup: {
    successTitle: 'Account created',
    successBody: 'Check your inbox to verify your email address.',
    submit: 'Create account',
  },
  forgot: {
    successTitle: 'Check your email',
    successBody: 'If an account exists, we sent a reset link.',
    submit: 'Send reset link',
  },
  reset: {
    successTitle: 'Password updated',
    successBody: 'Your password has been reset. You can now sign in.',
    submit: 'Reset password',
  },
  verify: {
    successTitle: 'Email verified',
    successBody: 'Your email is confirmed. You can now sign in.',
    submit: 'Verify email',
  },
};

export default function AuthForm({ mode }: AuthFormProps) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setDone(true);
    }, 800);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <CheckCircle2 size={40} className="text-accent2" />
        <h2 className="mt-3 text-base font-bold text-mtext">{copy[mode].successTitle}</h2>
        <p className="mt-1 text-sm text-stext">{copy[mode].successBody}</p>
        {(mode === 'signin' || mode === 'reset' || mode === 'verify') && (
          <Link
            href={mode === 'signin' ? '/' : '/signin'}
            className="mt-5 inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent2"
          >
            {mode === 'signin' ? 'Go home' : 'Sign in'}
          </Link>
        )}
        {mode === 'forgot' && (
          <Link href="/signin" className="mt-5 text-sm font-semibold text-accent hover:text-accent2">
            Back to sign in
          </Link>
        )}
        {mode === 'signup' && (
          <Link href="/signin" className="mt-5 text-sm font-semibold text-accent hover:text-accent2">
            Continue to sign in
          </Link>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {mode === 'signup' && (
        <Field label="Full name">
          <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stext" />
          <input
            type="text"
            required
            placeholder="Your name"
            className={inputClass}
            autoComplete="name"
          />
        </Field>
      )}

      {(mode === 'signin' || mode === 'signup' || mode === 'forgot' || mode === 'verify') && (
        <Field label="Email">
          <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stext" />
          <input
            type="email"
            required
            placeholder="you@example.com"
            className={inputClass}
            autoComplete="email"
          />
        </Field>
      )}

      {(mode === 'signin' || mode === 'signup' || mode === 'reset') && (
        <Field label={mode === 'reset' ? 'New password' : 'Password'}>
          <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stext" />
          <input
            type={show ? 'text' : 'password'}
            required
            minLength={8}
            placeholder="••••••••"
            className={`${inputClass} pr-10`}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-stext hover:text-mtext"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </Field>
      )}

      {mode === 'reset' && (
        <Field label="Confirm password">
          <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stext" />
          <input
            type={show ? 'text' : 'password'}
            required
            minLength={8}
            placeholder="••••••••"
            className={inputClass}
            autoComplete="new-password"
          />
        </Field>
      )}

      {mode === 'signin' && (
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs text-stext">
            <input type="checkbox" className="h-3.5 w-3.5 rounded border-lborder accent-accent" />
            Remember me
          </label>
          <Link href="/forgot-password" className="text-xs font-semibold text-accent hover:text-accent2">
            Forgot password?
          </Link>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-bold text-white transition-colors hover:bg-accent2 disabled:opacity-70"
      >
        {loading && <Loader2 size={15} className="animate-spin" />}
        {copy[mode].submit}
      </button>
    </form>
  );
}

const inputClass =
  'w-full rounded-lg bg-elevated py-2.5 pl-10 pr-4 text-sm text-mtext ring-1 ring-lborder outline-none transition-colors placeholder:text-stext/60 focus:ring-accent';

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stext">
        {label}
      </label>
      <div className="relative">{children}</div>
    </div>
  );
}
