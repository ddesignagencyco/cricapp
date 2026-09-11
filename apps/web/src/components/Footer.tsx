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
      { label: 'Schedule', to: '/schedules' },
      { label: 'Teams', to: '/teams' },
      { label: 'Players', to: '/players' },
      { label: 'Live Streams', to: '/streams' },
      { label: 'News', to: '/news' },
    ],
  },
  {
    title: 'PSL 2026',
    links: [
      { label: 'PSL Overview', to: '/psl' },
      { label: 'Teams', to: '/teams' },
      { label: 'Schedule', to: '/matches' },
      { label: 'News', to: '/news' },
      { label: 'Results', to: '/matches' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', to: '/about' },
      { label: 'Contact', to: '/contact' },
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms of Service', to: '/terms' },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-lborder bg-secondary">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr_1.2fr]">
          <div>
            <Logo size="xl" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-stext">
              Every Run. Every Ball. Live. Your home for cricket live scores, PSL fixtures, teams, players and in-depth analysis.
            </p>
          </div>

          {footerCols.map((col) => (
            <div key={col.title}>
              <p className="mb-4 text-sm font-bold uppercase tracking-widest text-stext">
                {col.title}
              </p>
              <ul className="space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
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
            <p className="mb-4 text-sm font-bold uppercase tracking-widest text-stext">
              Download Our App
            </p>
            <p className="mb-4 text-sm text-stext">
              Live scores, news and more on the go.
            </p>
            <div className="flex w-full max-w-[14rem] flex-col gap-2">
              <button
                type="button"
                disabled
                className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded bg-card px-3 py-2.5 text-xs font-medium text-stext ring-1 ring-lborder opacity-70"
              >
                <Download size={14} />
                App Store soon
              </button>
              <button
                type="button"
                disabled
                className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded bg-card px-3 py-2.5 text-xs font-medium text-stext ring-1 ring-lborder opacity-70"
              >
                <Download size={14} />
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
