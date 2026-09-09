'use client';

import Link from 'next/link';
import { AtSign, Camera, Mail, Video, Download } from 'lucide-react';
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

const socials = [
  { icon: Video, label: 'Watch', href: '#' },
  { icon: Camera, label: 'Photos', href: '#' },
  { icon: AtSign, label: 'X', href: '#' },
  { icon: Mail, label: 'Mail', href: '#' },
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-lborder bg-secondary">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr_1.2fr]">
          <div>
            <Logo size="lg" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-stext">
              Every Run. Every Ball. Live. Your home for cricket live scores, PSL fixtures, teams, players and in-depth analysis.
            </p>
            <div className="mt-5 flex gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  onClick={(e) => e.preventDefault()}
                  aria-label={s.label}
                  className="grid h-9 w-9 place-items-center rounded-lg bg-card text-stext ring-1 ring-lborder transition-colors hover:text-accent hover:ring-accent/40"
                >
                  <s.icon size={16} />
                </a>
              ))}
            </div>
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
            <div className="flex gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-2 text-[11px] font-semibold text-mtext ring-1 ring-lborder transition-colors hover:bg-elevated"
              >
                <Download size={13} />
                App Store
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-card px-3 py-2 text-[11px] font-semibold text-mtext ring-1 ring-lborder transition-colors hover:bg-elevated"
              >
                <Download size={13} />
                Google Play
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-lborder">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <p className="text-xs text-stext">
            &copy; {CURRENT_YEAR} PakCricZone. All rights reserved.
          </p>
          <p className="text-xs text-stext">
            Cricket Brings Us Together ❤
          </p>
        </div>
      </div>
    </footer>
  );
}
