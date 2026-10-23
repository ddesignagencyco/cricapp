import React, { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { storage } from '../utils/storage';

/*
 * Session state. Until the NestJS auth endpoints are wired, sign-in is
 * local: the forms validate and the user is kept on device. Swapping in
 * the API means replacing the bodies of signIn / signUp / signOut.
 */

export interface User {
  name: string;
  email: string;
}

interface AuthValue {
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const KEY = 'auth.user';
const Ctx = createContext<AuthValue | null>(null);
const wait = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    storage.get<User>(KEY).then(u => u && setUser(u));
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      user,
      signIn: async email => {
        await wait(700);
        const u = { name: email.split('@')[0].replace(/[._]/g, ' '), email };
        setUser(u);
        storage.set(KEY, u);
      },
      signUp: async (name, email) => {
        await wait(800);
        const u = { name, email };
        setUser(u);
        storage.set(KEY, u);
      },
      signOut: () => {
        setUser(null);
        storage.set(KEY, null);
      },
    }),
    [user],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth must be used inside AuthProvider');
  return v;
}

export const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());

/** 0–4 score for the strength meter. */
export function passwordStrength(p: string) {
  let score = 0;
  if (p.length >= 8) score++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
  if (/\d/.test(p)) score++;
  if (/[^A-Za-z0-9]/.test(p) || p.length >= 12) score++;
  return score;
}
