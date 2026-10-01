'use client';

import Link from 'next/link';
import { Download, Mail, MapPin, Phone } from 'lucide-react';
import Logo from './Logo';
import SiteSocialLinks from './SiteSocialLinks';
import SocialBrandIcon from './admin/SocialBrandIcon';
import {
  formatSiteLocation,
  mapsHref,
  publicSocials,
  type SiteSettings,
} from '../services/siteSettings';
import { phoneHref, whatsappHref } from '../lib/socialPlatforms';

const CURRENT_YEAR = new Date().getFullYear();

/**
 * The header already carries every browse destination (matches, teams,
 * players, tools, news, gallery, PSL, tours, …), so repeating them here only
 * adds noise and maintenance. The footer keeps what the header does not
 * surface: the CMS-driven editorial pages and the handful of secondary
 * routes that are not in the primary navigation.
 */
const footerCols = [
  {
    title: 'Company',
    span: 'lg:col-span-3',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Editorial Policy', to: '/editorial/editorial-policy' },
      { label: 'Corrections', to: '/editorial/corrections' },
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms of Service', to: '/terms' },
    ],
  },
  {
    title: 'More',
    span: 'lg:col-span-2',
    links: [
      { label: 'Urdu News', to: '/ur/news' },
      { label: 'Pakistan Cricket', to: '/pakistan' },
      { label: 'Contact Us', to: '/contact' },
    ],
  },
];

export default function Footer({ settings }: { settings?: SiteSettings | null }) {
  const location = settings ? formatSiteLocation(settings) : '';
  const socials = settings ? publicSocials(settings) : [];
  const email = settings?.email?.trim() || '';
  const phone = settings?.phone?.trim() || '';
  const whatsapp = settings?.whatsapp?.trim() || '';
  const mapLink = mapsHref(settings?.mapsUrl);
  const hasContact = Boolean(email || phone || whatsapp || location);

  return (
    <footer className="mt-12 border-t border-lborder bg-card sm:mt-16">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-y-12">
          <div className="sm:col-span-2 lg:col-span-5">
            <Logo size="footer" />
            <p className="mt-5 max-w-sm text-sm leading-relaxed text-stext">
              Every Run. Every Ball. Live. Your home for cricket live scores, PSL fixtures, teams,
              players and in-depth analysis.
            </p>

            {hasContact ? (
              <ul className="mt-5 max-w-sm space-y-2.5 text-sm text-stext">
                {email ? (
                  <li className="flex min-w-0 items-start gap-2.5">
                    <span className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-md bg-secondary">
                      <Mail size={13} aria-hidden="true" />
                    </span>
                    <a
                      href={`mailto:${email}`}
                      className="min-w-0 break-all transition-colors hover:text-accent"
                    >
                      {email}
                    </a>
                  </li>
                ) : null}
                {phone ? (
                  <li className="flex min-w-0 items-start gap-2.5">
                    <span className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-md bg-secondary">
                      <Phone size={13} aria-hidden="true" />
                    </span>
                    <a
                      href={phoneHref(phone)}
                      className="min-w-0 break-words transition-colors hover:text-accent"
                    >
                      {phone}
                    </a>
                  </li>
                ) : null}
                {whatsapp ? (
                  <li className="flex min-w-0 items-start gap-2.5">
                    <span className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-md bg-secondary">
                      <SocialBrandIcon id="whatsapp" size={16} />
                    </span>
                    <a
                      href={whatsappHref(whatsapp)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 break-words transition-colors hover:text-accent"
                    >
                      {whatsapp}
                    </a>
                  </li>
                ) : null}
                {location ? (
                  <li className="flex min-w-0 items-start gap-2.5">
                    <span className="mt-px grid h-6 w-6 shrink-0 place-items-center rounded-md bg-secondary">
                      <MapPin size={13} aria-hidden="true" />
                    </span>
                    {mapLink ? (
                      <a
                        href={mapLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="min-w-0 break-words transition-colors hover:text-accent"
                      >
                        {location}
                      </a>
                    ) : (
                      <span className="min-w-0 break-words">{location}</span>
                    )}
                  </li>
                ) : null}
              </ul>
            ) : null}

            <SiteSocialLinks socials={socials} className="mt-5" />
          </div>

          {footerCols.map((col) => (
            <nav key={col.title} className={`min-w-0 ${col.span}`} aria-label={col.title}>
              <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-mtext">
                {col.title}
              </p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-1">
                {col.links.map((link) => (
                  <li key={link.to} className="min-w-0">
                    <Link
                      href={link.to}
                      className="block text-sm leading-snug text-stext transition-colors hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          <div className="min-w-0 sm:col-span-2 lg:col-span-2">
            <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.14em] text-mtext">
              Get the app
            </p>
            <p className="mb-4 max-w-[14rem] text-sm leading-relaxed text-stext">
              Live scores, news and more on the go.
            </p>
            <div className="flex w-full max-w-[14rem] flex-col gap-2">
              <button
                type="button"
                disabled
                className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded bg-secondary px-3 py-2.5 text-xs font-semibold text-[var(--color-text-disabled)] ring-1 ring-lborder"
              >
                <Download size={14} aria-hidden="true" />
                App Store soon
              </button>
              <button
                type="button"
                disabled
                className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded bg-secondary px-3 py-2.5 text-xs font-semibold text-[var(--color-text-disabled)] ring-1 ring-lborder"
              >
                <Download size={14} aria-hidden="true" />
                Google Play soon
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-lborder">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-1.5 px-4 py-5 text-center text-xs text-stext sm:flex-row sm:justify-between sm:px-6 sm:text-left">
          <p>&copy; {CURRENT_YEAR} PakCricZone. All rights reserved.</p>
          <p className="text-muted-foreground">Every run. Every ball. Live.</p>
        </div>
      </div>
    </footer>
  );
}
