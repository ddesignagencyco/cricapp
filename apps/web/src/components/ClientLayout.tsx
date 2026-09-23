'use client';

import { usePathname } from 'next/navigation';
import { Suspense, type ReactNode } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ScrollTopButton from '../components/ScrollTopButton';
import MobileBottomNav from './MobileBottomNav';
import AssistantLauncher from './assistant/AssistantLauncher';
import DummyAd from './advertisements/DummyAd';
import { shouldHideDummyAds } from '../lib/advertisements/placements';
import type { SiteSettings } from '../services/siteSettings';

function isNewsArticlePath(pathname: string) {
  return /^\/(ur\/)?news\/.+/.test(pathname) || pathname.startsWith('/cricket-news/');
}

function isEditorialPath(pathname: string) {
  return (
    pathname.startsWith('/editorial/') ||
    pathname === '/about' ||
    pathname === '/privacy' ||
    pathname === '/terms'
  );
}

function showGlobalTopAd(pathname: string) {
  if (shouldHideDummyAds(pathname)) return false;
  if (pathname === '/') return false;
  if (pathname.startsWith('/matches/') && pathname !== '/matches') return false;
  if (isNewsArticlePath(pathname)) return false;
  if (pathname.startsWith('/authors/')) return false;
  if (pathname.startsWith('/teams/') && pathname !== '/teams') return false;
  if (pathname.startsWith('/players/') && pathname !== '/players') return false;
  if (isEditorialPath(pathname)) return false;
  return true;
}

export default function ClientLayout({
  children,
  settings,
}: {
  children: ReactNode;
  settings?: SiteSettings | null;
}) {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/admin');

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      {showGlobalTopAd(pathname) ? (
        <div className="mx-auto w-full min-w-0 max-w-7xl px-4 py-5 sm:px-6">
          <DummyAd size="leaderboard" placement={`global-top:${pathname}`} />
        </div>
      ) : null}
      <main id="main-content" className="min-h-screen min-w-0 flex-1 pb-16 lg:pb-0">
        {children}
      </main>
      <Footer settings={settings} />
      <MobileBottomNav />
      <ScrollTopButton />
      <Suspense fallback={null}>
        <AssistantLauncher />
      </Suspense>
    </>
  );
}
