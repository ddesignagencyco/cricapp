import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError } from '../api/client';
import { authApi, type AuthUser } from '../api/auth';

/*
 * Session state backed by the CricApp API. The session itself is the
 * HttpOnly cookie, so on launch we just ask /auth/me who we are.
 */

interface AuthValue {
  user: AuthUser | null;
  /** True until the launch-time /auth/me check finishes. */
  checking: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (payload: { name: string; username: string; email: string; password: string }) => Promise<string>;
  signOut: () => Promise<void>;
  resendVerification: (email: string) => Promise<string>;
  forgotPassword: (email: string) => Promise<string>;
  verifyEmail: (email: string, code: string) => Promise<string>;
  resetPassword: (email: string, code: string, password: string) => Promise<string>;
}

const Ctx = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    authApi
      .me()
      .then(setUser)
      // 401 just means signed out; a network error leaves us signed out too.
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      checking,
      signIn: async (email, password) => {
        const res = await authApi.login(email, password);
        setUser(res.user);
      },
      signUp: async ({ name, username, email, password }) => {
        const res = await authApi.signup({ email, username, password, displayName: name || undefined });
        return res.message;
      },
      signOut: async () => {
        try {
          await authApi.logout();
        } finally {
          setUser(null);
        }
      },
      resendVerification: async email => (await authApi.resendVerification(email)).message,
      forgotPassword: async email => (await authApi.forgotPassword(email)).message,
      verifyEmail: async (email, code) => (await authApi.verifyEmail(email, code)).message,
      resetPassword: async (email, code, password) => (await authApi.resetPassword(email, code, password)).message,
    }),
    [user, checking],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}

/** Name to show for a user: display name, else username. */
export const displayName = (u: AuthUser) => u.displayName?.trim() || u.username;

/** 403 from /auth/login means the email isn't verified yet. */
export const isUnverified = (e: unknown) => e instanceof ApiError && e.status === 403;

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

/**
 * Unique, URL-safe username from a full name: "Ali Raza" → "ali_raza_4821".
 * The API only needs 3+ characters and uniqueness; the random suffix avoids
 * clashes between people with the same name.
 */
export function usernameFrom(name: string) {
  const base =
    name
      .normalize('NFKD')
      // Drop accents left over from normalising (é → e).
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 20) || 'fan';
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `${base}_${suffix}`;
}

/** 0–4 score for the strength meter. */
export function passwordStrength(p: string) {
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) score++;
  return score;
}
