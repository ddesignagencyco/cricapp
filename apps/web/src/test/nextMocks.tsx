/**
 * Test-only stubs for the Next.js modules components import. Registered from
 * setup.ts so individual suites do not each have to re-declare them.
 *
 * The props are typed loosely on purpose: these mirror the real component
 * signatures, and being stricter than Next would make the stubs lie.
 */
import React from 'react';

/**
 * Global stubs for the Next.js modules components import. Registered from
 * setup.ts so individual suites do not each have to re-declare them.
 *
 * `next/image` is stubbed to a plain <img> carrying the props we care about in
 * data attributes, because the real component defers rendering until it knows
 * its own dimensions and would make every image assertion flaky.
 */

export const nextMocks = {
  navigation: {
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
      forward: jest.fn(),
    }),
    usePathname: () => '/',
    useSearchParams: () => new URLSearchParams(''),
    useParams: () => ({}),
    useSelectedLayoutSegment: () => null,
    useSelectedLayoutSegments: () => [],
    redirect: jest.fn(),
    notFound: jest.fn(),
  },
  headers: {
    headers: () => new Headers(),
    cookies: () => new Map(),
  },
};

export function createNextNavigationMock() {
  return nextMocks.navigation;
}

/** Minimal <img> stand-in for next/image. */
export function MockImage(props: any) {
  const { fill, unoptimized, priority, quality, loader, placeholder, blurDataURL, onLoadingComplete, ...rest } =
    props || {};
  void fill;
  void unoptimized;
  void priority;
  void quality;
  void loader;
  void placeholder;
  void blurDataURL;
  void onLoadingComplete;
  return React.createElement('img', { 'data-testid': 'next-image', ...rest });
}

/** Plain anchor stand-in for next/link. */
export function MockLink(props: any) {
  const { href, prefetch, replace, scroll, shallow, passHref, legacyBehavior, onNavigate, ...rest } = props || {};
  void prefetch;
  void replace;
  void scroll;
  void shallow;
  void passHref;
  void legacyBehavior;
  void onNavigate;
  const url = typeof href === 'string' ? href : (href?.pathname ?? '');
  return React.createElement('a', { href: url, ...rest });
}
