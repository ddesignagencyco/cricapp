'use client';

import Link from 'next/link';
import { Mail, User } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';
import { useAuth } from '../AuthProvider';
import { ApiError } from '../../services/api/client';
import {
  forgotPassword,
  login,
  register,
  resendVerification,
  resetPassword,
  verifyEmail,
} from '../../services/auth';
import type { AuthUser, MessageResponse } from '../../types/auth';
import FormMessage from './FormMessage';
import PasswordField from './PasswordField';

const verifyEmailRequests = new Map<string, Promise<MessageResponse>>();

function alreadyVerified(text: string): boolean {
  return /already verified/i.test(text);
}

function verifyEmailOnce(token: string, tokenId: string): Promise<MessageResponse> {
  const key = `${tokenId}:${token}`;
  const pending = verifyEmailRequests.get(key);
  if (pending) return pending;
  const request = verifyEmail({ token, tokenId });
  verifyEmailRequests.set(key, request);
  return request;
}

type Mode = 'login' | 'register' | 'forgot' | 'reset' | 'verify';

interface AuthFormProps {
  mode: Mode;
  token?: string;
  tokenId?: string;
  initialEmail?: string;
}

interface FieldErrors {
  email?: string;
  name?: string;
  password?: string;
  confirmPassword?: string;
  terms?: string;
  token?: string;
}

const inputClass =
  'w-full rounded-2xl border border-lborder bg-secondary/80 py-3 pl-10 pr-4 text-sm text-mtext outline-none transition-all placeholder:text-stext/50 focus:border-accent focus:bg-card focus:ring-2 focus:ring-accent/20';

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message;
  return 'Unable to complete the request. Check your connection and try again.';
}

function safeReturnTo(value: string | null): string {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/';
}

function slugFromName(name: string, email: string): string {
  const source = name.trim() || email.split('@')[0] || 'cricket-fan';
  const slug = source.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 24);
  return slug.length >= 3 ? slug : `fan${slug}`.slice(0, 24);
}

function TextField({
  id,
  label,
  name,
  type,
  value,
  onChange,
  autoComplete,
  error,
  placeholder,
}: {
  id: string;
  label: string;
  name: string;
  type: 'email' | 'text';
  value: string;
  onChange: (_value: string) => void;
  autoComplete: string;
  error?: string;
  placeholder: string;
}) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-stext">
        {label}
      </label>
      <div className="relative">
        {type === 'email' ? (
          <Mail size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stext" />
        ) : (
          <User size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-stext" />
        )}
        <input
          id={id}
          name={name}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={inputClass}
        />
      </div>
      {error && <p id={errorId} className="text-xs font-semibold text-danger">{error}</p>}
    </div>
  );
}

export default function AuthForm({ mode, token = '', tokenId = '', initialEmail = '' }: AuthFormProps) {
  const router = useRouter();
  const params = useSearchParams();
  const { refresh } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(mode === 'verify');
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const [verified, setVerified] = useState(false);
  const [unverifiedLogin, setUnverifiedLogin] = useState(false);

  useEffect(() => {
    if (mode !== 'verify') return;
    if (!token || !tokenId) {
      setLoading(false);
      setMessage('This verification link is missing or incomplete.');
      return;
    }
    let cancelled = false;
    verifyEmailOnce(token, tokenId)
      .then((response) => {
        if (cancelled) return;
        setSuccess(response.message);
        setVerified(true);
        toast.success(response.message, { id: 'verify-email' });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const text = errorMessage(error);
        if (alreadyVerified(text)) {
          setSuccess(text);
          setVerified(true);
          toast.success(text, { id: 'verify-email' });
          return;
        }
        setMessage(text);
        toast.error(text, { id: 'verify-email' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, token, tokenId]);

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if ((mode === 'login' || mode === 'register' || mode === 'forgot') && !/^\S+@\S+\.\S+$/.test(email.trim())) next.email = 'Enter a valid email address.';
    if (mode === 'register' && name.trim().length < 2) next.name = 'Enter your full name.';
    if ((mode === 'login' || mode === 'register' || mode === 'reset') && password.length < 6) next.password = 'Password must be at least 6 characters.';
    if ((mode === 'register' || mode === 'reset') && password !== confirmPassword) next.confirmPassword = 'Passwords do not match.';
    if (mode === 'register' && !terms) next.terms = 'Accept the terms to continue.';
    if (mode === 'reset' && (!token || !tokenId)) next.token = 'Open the reset link from your email to set a new password.';
    return next;
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setMessage('');
    setSuccess('');
    setUnverifiedLogin(false);
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    setLoading(true);
    try {
      if (mode === 'login') {
        const response = await login({ email: email.trim(), password });
        const user: AuthUser = response.user;
        await refresh();
        setSuccess(`Welcome back, ${user.displayName || user.username}.`);
        const returnTo = params.get('returnTo');
        router.replace(returnTo ? safeReturnTo(returnTo) : user.isAdmin ? '/admin' : '/');
      } else if (mode === 'register') {
        const created = await register({ email: email.trim(), username: slugFromName(name, email), displayName: name.trim(), password });
        setSuccess(created.message || 'Account created. Check your email to verify your address before signing in.');
        toast.success('Account created. Check your inbox to verify your email.');
        router.replace('/login');
      } else if (mode === 'forgot') {
        const response = await forgotPassword({ email: email.trim() });
        setSuccess(response.message);
        toast.success('If an account exists, we sent a reset link to your email.');
      } else if (mode === 'reset') {
        const response = await resetPassword({
          tokenId,
          token,
          password,
        });
        setSuccess(response.message);
        toast.success('Password reset successfully.');
        router.replace('/login');
      }
    } catch (error: unknown) {
      const text = errorMessage(error);
      setMessage(text);
      if (mode === 'login' && error instanceof ApiError && error.status === 403) {
        setUnverifiedLogin(true);
      }
      toast.error(text);
    } finally {
      setLoading(false);
    }
  };

  if (mode === 'verify') {
    return (
      <div className="space-y-4 text-center">
        {loading && <p className="text-sm text-stext">Verifying your email…</p>}
        {!loading && success && <FormMessage message={success} tone="success" />}
        {!loading && message && <FormMessage message={message} />}
        {!loading && !verified && (
          <ResendForm
            initialEmail={email}
            onAlreadyVerified={(text) => {
              setVerified(true);
              setSuccess(text);
              setMessage('');
            }}
          />
        )}
        {!loading && <Link href="/login" className="inline-block text-sm font-semibold text-accent hover:text-accent2">Continue to login</Link>}
      </div>
    );
  }

  if (mode === 'reset' && (!token || !tokenId)) {
    return (
      <div className="space-y-4 text-center">
        <FormMessage message="This reset page only works from the link in your email. Password-reset codes are no longer used." />
        <Link href="/forgot-password" className="inline-block text-sm font-semibold text-accent hover:text-accent2">
          Request a new reset link
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      {mode === 'register' && <TextField id="name" label="Full name" name="name" type="text" value={name} onChange={setName} autoComplete="name" placeholder="Your full name" error={errors.name} />}
      {(mode === 'login' || mode === 'register' || mode === 'forgot') && <TextField id="email" label="Email" name="email" type="email" value={email} onChange={setEmail} autoComplete="email" placeholder="you@example.com" error={errors.email} />}
      {(mode === 'login' || mode === 'register' || mode === 'reset') && <PasswordField id="password" label={mode === 'reset' ? 'New password' : 'Password'} name="password" value={password} onChange={setPassword} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} error={errors.password} />}
      {mode === 'register' && <PasswordField id="confirm-password" label="Confirm password" name="confirmPassword" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" error={errors.confirmPassword} />}
      {mode === 'reset' && <>
        <PasswordField id="confirm-password" label="Confirm password" name="confirmPassword" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" error={errors.confirmPassword} />
        <div className="rounded border border-lborder bg-elevated/50 p-3 text-xs text-stext">Use at least 6 characters. Avoid using a password you use elsewhere.</div>
        {errors.token && <FormMessage message={errors.token} />}
      </>}
      {mode === 'register' && (
        <label className="flex items-start gap-2 text-xs text-stext cursor-pointer">
          <input
            type="checkbox"
            checked={terms}
            onChange={(event) => setTerms(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-lborder accent-accent cursor-pointer"
          />
          <span>
            I agree to the{' '}
            <Link href="/terms" className="font-semibold text-accent hover:text-accent2">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="font-semibold text-accent hover:text-accent2">
              Privacy Policy
            </Link>.
          </span>
        </label>
      )}
      {errors.terms && <FormMessage message={errors.terms} />}
      {mode === 'login' && (
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs font-semibold text-accent hover:text-accent2">
            Forgot password?
          </Link>
        </div>
      )}
      <FormMessage message={message} />
      <FormMessage message={success} tone="success" />
      {unverifiedLogin && (
        <div className="rounded-xl border border-lborder bg-elevated/60 p-3">
          <p className="mb-2 text-xs text-stext">This account is not verified yet. Request a new verification email below.</p>
          <ResendForm initialEmail={email} />
        </div>
      )}
      <button
        type="submit"
        disabled={loading}
        className="btn-brand w-full rounded py-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-card disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading
          ? 'Please wait…'
          : mode === 'login'
          ? 'Sign in to Account'
          : mode === 'register'
          ? 'Create Free Account'
          : mode === 'forgot'
          ? 'Send reset link'
          : 'Reset Password'}
      </button>
    </form>
  );
}

function ResendForm({
  initialEmail = '',
  onAlreadyVerified,
}: {
  initialEmail?: string;
  onAlreadyVerified?: (_message: string) => void;
}) {
  const [email, setEmail] = useState(initialEmail);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const resend = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const response = await resendVerification({ email: email.trim() });
      setMessage(response.message);
      if (alreadyVerified(response.message)) {
        toast.success(response.message, { id: 'verify-email' });
        onAlreadyVerified?.(response.message);
        return;
      }
      toast.success('Verification email request sent.', { id: 'verify-email-resent' });
    } catch (error: unknown) {
      const text = errorMessage(error);
      setMessage(text);
      toast.error(text, { id: 'verify-email-resent' });
    } finally {
      setLoading(false);
    }
  };
  return (
    <form onSubmit={resend} className="space-y-2 text-left">
      <label htmlFor="resend-email" className="block text-xs font-semibold text-mtext">Resend verification email</label>
      <input id="resend-email" name="email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" autoComplete="email" className={inputClass} />
      <button type="submit" disabled={loading} className="w-full rounded bg-elevated px-3 py-2 text-xs font-bold text-mtext ring-1 ring-lborder disabled:opacity-60">{loading ? 'Sending…' : 'Resend email'}</button>
      {message && <FormMessage message={message} tone="info" />}
    </form>
  );
}
