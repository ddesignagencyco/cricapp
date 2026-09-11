'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, AtSign, CheckCircle2, Loader2, Mail, ShieldAlert, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../components/AuthProvider';
import { resendVerification, updateProfile } from '../../services/auth';
import { getInitials } from '../../utils/helpers';
import RemoteImage from '../../components/RemoteImage';

const fieldClass =
  'mt-1.5 w-full rounded-md border border-lborder bg-elevated px-3.5 py-2.5 text-sm text-mtext outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20';

export default function ProfilePage() {
  const { user, loading, isAuthenticated, refresh } = useAuth();
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

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <header className="relative mb-6 overflow-hidden rounded-md border border-lborder bg-card p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-accent/5 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            {user.avatarUrl ? (
              <RemoteImage
                src={user.avatarUrl}
                alt=""
                width={64}
                height={64}
                className="h-16 w-16 shrink-0 rounded-md border border-lborder object-cover"
              />
            ) : (
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-md bg-accent text-lg font-semibold text-white">
                {initials}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">Profile</p>
              <h1 className="mt-1 truncate text-2xl font-semibold tracking-tight text-mtext sm:text-3xl">{name}</h1>
              <p className="mt-1 truncate text-sm text-stext">@{user.username}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold ${
                user.emailVerified
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
              }`}
            >
              {user.emailVerified ? <CheckCircle2 size={13} /> : <ShieldAlert size={13} />}
              {user.emailVerified ? 'Email verified' : 'Email unverified'}
            </span>
            {user.isAdmin && (
              <span className="inline-flex items-center rounded-md bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent">
                Admin
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <aside className="space-y-3 lg:col-span-1">
          <div className="rounded-md border border-lborder bg-card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stext">Email</h2>
            <p className="mt-2 flex items-start gap-2 text-sm text-mtext">
              <Mail size={15} className="mt-0.5 shrink-0 text-accent" />
              <span className="break-all">{user.email}</span>
            </p>
            {!user.emailVerified && (
              <button
                type="button"
                onClick={resend}
                disabled={resending}
                className="mt-4 w-full rounded-md border border-lborder bg-secondary px-3 py-2 text-xs font-semibold text-accent hover:bg-elevated disabled:opacity-60"
              >
                {resending ? 'Sending…' : 'Resend verification email'}
              </button>
            )}
          </div>
          <div className="rounded-md border border-lborder bg-card p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-stext">Username</h2>
            <p className="mt-2 flex items-center gap-2 text-sm text-mtext">
              <AtSign size={15} className="text-accent" />
              {user.username}
            </p>
          </div>
        </aside>

        <form onSubmit={save} className="rounded-md border border-lborder bg-card p-5 sm:p-6 lg:col-span-2">
          <h2 className="text-sm font-semibold text-mtext">Edit profile</h2>
          <p className="mt-1 text-sm text-stext">These details appear on comments and your public activity.</p>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-stext">
              Display name
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="block text-xs font-semibold text-stext">
              Username
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={fieldClass}
              />
            </label>
            <label className="block text-xs font-semibold text-stext sm:col-span-2">
              Avatar URL
              <input
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://…"
                className={fieldClass}
              />
            </label>
          </div>

          {avatarUrl.trim() ? (
            <div className="mt-4 flex items-center gap-3 rounded-md border border-lborder bg-secondary px-3 py-2.5">
              <RemoteImage src={avatarUrl} alt="" width={40} height={40} className="h-10 w-10 rounded-md object-cover" />
              <p className="text-xs text-stext">Preview of the image at this URL.</p>
            </div>
          ) : null}

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="btn-brand inline-flex items-center gap-2 rounded-md px-4 py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <User size={14} />}
              Save profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
