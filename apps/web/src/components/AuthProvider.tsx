'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getCurrentUser, logout as logoutService } from '../services/auth';
import { clearFavoriteCache } from '../services/favorites';
import type { AuthUser } from '../types/auth';
import { ApiError } from '../services/api/client';

interface AuthContextValue {
  user: AuthUser | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Set by the API next to the HttpOnly session cookie; see `AUTH_HINT_COOKIE_NAME` there. */
const AUTH_HINT_COOKIE = 'cz_signed_in';

function hasSessionHint(): boolean {
  return document.cookie.split(';').some((part) => part.trim().startsWith(`${AUTH_HINT_COOKIE}=`));
}

function clearSessionHint(): void {
  document.cookie = `${AUTH_HINT_COOKIE}=; Max-Age=0; path=/`;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    // No hint cookie means nobody signed in on this browser: skip the probe that
    // would 401 (and log a console error) on every anonymous page view.
    if (!hasSessionHint()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const me = await getCurrentUser();
      setUser(me);
    } catch (error) {
      if (error instanceof ApiError && error.status !== 401) {
        // Keep going; session probe failed for a non-auth reason.
      }
      setUser(null);
      clearFavoriteCache();
      // The session expired or was revoked; stop probing until the next sign-in.
      if (error instanceof ApiError && error.status === 401) clearSessionHint();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const logout = useCallback(() => {
    void logoutService();
    clearFavoriteCache();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin: Boolean(user?.isAdmin || user?.isSuperAdmin),
        isSuperAdmin: Boolean(user?.isSuperAdmin),
        isAuthenticated: Boolean(user),
        loading,
        refresh,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
