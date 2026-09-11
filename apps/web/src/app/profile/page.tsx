'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  KeyRound,
  Loader2,
  Mail,
  ShieldAlert,
  ShieldCheck,
  User,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../components/AuthProvider';
import { resendVerification, updateProfile } from '../../services/auth';
import { getInitials } from '../../utils/helpers';
import RemoteImage from '../../components/RemoteImage';

const fieldClass =
  'mt-1.5 w-full rounded-md border border-lborder bg-elevated px-3.5 py-2.5 text-sm text-mtext outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20';

type Tab = 'personal' | 'security';

export default function ProfilePage() {
  const { user, loading, isAuthenticated, refresh } = useAuth();
  const [tab, setTab] = useState<Tab>('personal');
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.displayName || '');
    setUsername(user.username || '');
    setAvatarUrl(user.avatarUrl || '');
  }, [user]);

  const dirty = useMemo(() => {
    if (!user) return false;
    return (
      displayName.trim() !== (user.displayName || '') ||
      username.trim() !== (user.username || '') ||
      avatarUrl.trim() !== (user.avatarUrl || '')
    );
  }, [user, displayName, username, avatarUrl]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3">
        <Loader2 size={32} className="animate-spin text-accent" />
        <p className="text-sm font-medium text-stext">Loading your profile…</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-7xl flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
        <div className="grid h-16 w-16 place-items-center rounded-md bg-accent/10 text-accent ring-1 ring-accent/25">
          <User size={32} />
        </div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-mtext">Sign in to manage your profile</h1>
        <p className="mt-2 max-w-md text-sm text-stext">
          Your display name, username and avatar are used on comments and favorites.
        </p>
        <Link
          href="/login?returnTo=/profile"
          className="btn-brand mt-6 inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm font-semibold"
        >
          Sign in
          <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  const resetForm = () => {
    setDisplayName(user.displayName || '');
    setUsername(user.username || '');
    setAvatarUrl(user.avatarUrl || '');
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        displayName: displayName.trim() || undefined,
        username: username.trim() || undefined,
        avatarUrl: avatarUrl.trim() || undefined,
      });
      await refresh();
      toast.success('Profile updated.');
    } catch {
      toast.error('Could not update your profile.');
    } finally {
      setSaving(false);
    }
  };

  const resend = async () => {
    setResending(true);
    try {
      await resendVerification({ email: user.email });
      toast.success('Verification email sent.');
    } catch {
      toast.error('Could not resend verification email.');
    } finally {
      setResending(false);
    }
  };

  const name = user.displayName || user.username;
  const initials = getInitials(name);
  const joined = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-mtext sm:text-3xl">Profile settings</h1>
          <p className="mt-1 text-sm text-stext">Manage your personal information and account security.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {tab === 'personal' && (
            <>
              <button
                type="button"
                onClick={resetForm}
                disabled={!dirty || saving}
                className="rounded-md border border-lborder bg-card px-4 py-2 text-sm font-semibold text-mtext hover:bg-elevated disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="profile-form"
                disabled={!dirty || saving}
                className="btn-brand inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold disabled:opacity-60"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                Save changes
              </button>
            </>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-md border border-lborder bg-card p-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-stext">Your profile</p>
          <div className="mt-5 flex flex-col items-center text-center">
            {avatarUrl.trim() || user.avatarUrl ? (
              <RemoteImage
                src={avatarUrl.trim() || user.avatarUrl || ''}
                alt=""
                width={112}
                height={112}
                className="h-28 w-28 rounded-full border border-lborder object-cover"
              />
            ) : (
              <span className="grid h-28 w-28 place-items-center rounded-full bg-accent text-2xl font-semibold text-white">
                {initials}
              </span>
            )}
            <h2 className="mt-4 text-lg font-semibold text-mtext">{name}</h2>
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">
              {user.isAdmin ? 'Administrator' : 'Member'}
            </p>
          </div>

          <ul className="mt-6 space-y-3 border-t border-lborder pt-5 text-sm">
            <li className="flex items-start gap-2 text-stext">
              <Mail size={15} className="mt-0.5 shrink-0 text-accent" />
              <span className="break-all text-mtext">{user.email}</span>
            </li>
            {joined && (
              <li className="text-stext">
                Member since {joined}
              </li>
            )}
          </ul>

          <div className="mt-5 rounded-md border border-lborder bg-secondary px-3 py-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-stext">Account status</p>
            <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-semibold">
              <span className={`h-2 w-2 rounded-full ${user.emailVerified ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className={user.emailVerified ? 'text-emerald-500' : 'text-amber-500'}>
                {user.emailVerified ? 'Active' : 'Email unverified'}
              </span>
            </p>
            <p className="mt-1 text-xs text-stext">
              {user.emailVerified
                ? 'Your account is verified and ready to use.'
                : 'Verify your email to finish setting up this account.'}
            </p>
          </div>
        </aside>

        <section className="rounded-md border border-lborder bg-card">
          <div className="flex flex-wrap gap-1 border-b border-lborder px-3 pt-3 sm:px-5">
            <TabButton active={tab === 'personal'} onClick={() => setTab('personal')} icon={<User size={14} />} label="Personal information" />
            <TabButton active={tab === 'security'} onClick={() => setTab('security')} icon={<ShieldCheck size={14} />} label="Security" />
          </div>

          {tab === 'personal' && (
            <form id="profile-form" onSubmit={save} className="p-5 sm:p-6">
              <h3 className="text-sm font-semibold text-mtext">Personal information</h3>
              <p className="mt-1 text-sm text-stext">These details appear on comments and your public activity.</p>

              <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <label className="block text-xs font-semibold text-stext">
                  Display name
                  <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={fieldClass} />
                  <span className="mt-1 block font-normal text-stext/80">Shown on comments and favorites.</span>
                </label>
                <label className="block text-xs font-semibold text-stext">
                  Username
                  <input value={username} onChange={(e) => setUsername(e.target.value)} className={fieldClass} />
                  <span className="mt-1 block font-normal text-stext/80">Your unique handle.</span>
                </label>
                <label className="block text-xs font-semibold text-stext">
                  Email address
                  <input value={user.email} readOnly className={`${fieldClass} cursor-not-allowed opacity-70`} />
                  <span className="mt-1 block font-normal text-stext/80">Email cannot be changed from this page.</span>
                </label>
                <label className="block text-xs font-semibold text-stext">
                  Photo URL
                  <input
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    placeholder="https://…"
                    className={fieldClass}
                  />
                  <span className="mt-1 block font-normal text-stext/80">Paste an image URL. File upload is not available.</span>
                </label>
              </div>
            </form>
          )}

          {tab === 'security' && (
            <div className="space-y-3 p-5 sm:p-6">
              <h3 className="text-sm font-semibold text-mtext">Security</h3>
              <p className="text-sm text-stext">Password reset and email verification for this account.</p>

              <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col justify-between rounded-md border border-lborder bg-elevated p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-md bg-card text-accent">
                      <KeyRound size={16} />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-mtext">Password</p>
                      <p className="mt-1 text-xs text-stext">Reset your password with a code sent to your email.</p>
                    </div>
                  </div>
                  <Link
                    href="/forgot-password"
                    className="mt-4 inline-flex w-fit rounded-md border border-lborder bg-card px-3 py-1.5 text-xs font-semibold text-accent hover:bg-secondary"
                  >
                    Change password
                  </Link>
                </div>

                <div className="flex flex-col justify-between rounded-md border border-lborder bg-elevated p-4">
                  <div className="flex items-start gap-3">
                    <span className="grid h-9 w-9 place-items-center rounded-md bg-card text-accent">
                      {user.emailVerified ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-mtext">Email verification</p>
                      <p className="mt-1 text-xs text-stext">
                        {user.emailVerified ? 'This email is verified.' : 'This email is not verified yet.'}
                      </p>
                    </div>
                  </div>
                  {!user.emailVerified ? (
                    <button
                      type="button"
                      onClick={resend}
                      disabled={resending}
                      className="mt-4 inline-flex w-fit rounded-md border border-lborder bg-card px-3 py-1.5 text-xs font-semibold text-accent hover:bg-secondary disabled:opacity-60"
                    >
                      {resending ? 'Sending…' : 'Resend verification email'}
                    </button>
                  ) : (
                    <p className="mt-4 text-xs font-semibold text-emerald-500">Verified</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-t-md border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors sm:text-sm ${
        active
          ? 'border-accent text-accent'
          : 'border-transparent text-stext hover:text-mtext'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
