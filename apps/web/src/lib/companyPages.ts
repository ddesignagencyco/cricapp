/**
 * The company / policy pages, in reading order. One list drives the footer, the
 * policy sidebar and pager, the admin editor presets, the sitemap and the
 * "no ads on policy pages" rule, so a new page cannot be half-registered.
 *
 * Every page lives at the site root (`/privacy`, `/editorial-policy`, …): each
 * has built-in default copy, and an admin-saved editorial page with the same
 * slug replaces it.
 */
export const COMPANY_PAGES = [
  { slug: 'about', href: '/about', label: 'About' },
  { slug: 'privacy', href: '/privacy', label: 'Privacy Policy' },
  { slug: 'cookie-policy', href: '/cookie-policy', label: 'Cookie Policy' },
  { slug: 'terms', href: '/terms', label: 'Terms of Service' },
  { slug: 'disclaimer', href: '/disclaimer', label: 'Disclaimer' },
  { slug: 'editorial-policy', href: '/editorial-policy', label: 'Editorial Policy' },
  { slug: 'corrections', href: '/corrections', label: 'Corrections' },
] as const;

export type CompanyPage = (typeof COMPANY_PAGES)[number];

const COMPANY_PATHS = new Set<string>(COMPANY_PAGES.map((page) => page.href));

export function isCompanyPath(pathname: string): boolean {
  return COMPANY_PATHS.has(pathname.replace(/\/+$/, '') || '/');
}
