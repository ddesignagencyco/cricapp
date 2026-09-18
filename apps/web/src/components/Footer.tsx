'use client';

import Link from 'next/link';
import { Download } from 'lucide-react';
import Logo from './Logo';

const CURRENT_YEAR = new Date().getFullYear();

const footerCols = [
  {
    title: 'Cricket',
    links: [
      { label: 'Matches', to: '/matches' },
      { label: 'Predictions', to: '/predictions' },
      { label: 'Teams', to: '/teams' },
      { label: 'Players', to: '/players' },
      { label: 'Authors', to: '/authors' },
      { label: 'Gallery', to: '/gallery' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    title: 'PSL & More',
    links: [
      { label: 'PSL Hub', to: '/psl' },
      { label: 'Tournaments', to: '/tournaments' },
      { label: 'Tours', to: '/tours' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms of Service', to: '/terms' },
      { label: 'Editorial Policy', to: '/editorial/editorial-policy' },
      { label: 'Corrections', to: '/editorial/corrections' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-lborder bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-2 items-start gap-x-8 gap-y-10 sm:grid-cols-3 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))_1.15fr]">
          <div className="col-span-2 sm:col-span-3 lg:col-span-1">
            <Logo size="xl" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-stext">
              Every Run. Every Ball. Live. Your home for cricket live scores, PSL fixtures, teams, players and in-depth analysis.
            </p>
          </div>

          {footerCols.map((col) => (
            <div key={col.title}>
              <p className="mb-4 text-xs font-bold uppercase tracking-wider text-stext">
                {col.title}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.to}>
                    <Link
                      href={link.to}
                      className="text-sm text-stext transition-colors hover:text-accent"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-stext">
              Get the app
            </p>
            <p className="mb-4 text-sm leading-relaxed text-stext">
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
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <p className="text-center text-xs text-stext">
            &copy; {CURRENT_YEAR} PakCricZone. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
