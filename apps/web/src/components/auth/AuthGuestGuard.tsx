'use client';

import { useEffect, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../AuthProvider';

const GUEST_ONLY = new Set(['/login', '/register', '/signup', '/signin']);

export default function AuthGuestGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const guestOnly = GUEST_ONLY.has(pathname);

  useEffect(() => {
    if (!loading && isAuthenticated && guestOnly) {
      router.replace('/profile');
    }
  }, [guestOnly, isAuthenticated, loading, router]);

  if (guestOnly && (loading || isAuthenticated)) {
    return <div className="min-h-[40vh]" aria-busy="true" />;
  }

  return children;
}
