'use client';

import Link from 'next/link';
import { AtSign, Camera, Mail, Video } from 'lucide-react';
import Logo from './Logo';

const footerCols = [
  {
    title: 'Cricket',
    links: [
      { label: 'Live Scores', to: '/live' },
      { label: 'Live Streams', to: '/streams' },
      { label: 'Matches', to: '/matches' },
      { label: 'Points Table', to: '/points-table' },
      { label: 'Statistics', to: '/stats' },
      { label: 'News', to: '/news' },
      { label: 'Favorites', to: '/favorites' },
    ],
  },
  {
    title: 'PSL 2026',
    links: [
      { label: 'PSL Overview', to: '/psl' },
      { label: 'Teams', to: '/teams' },
      { label: 'Players', to: '/players' },
      { label: 'Schedule', to: '/matches' },
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
  { icon: Video, label: 'Watch' },
  { icon: Camera, label: 'Photos' },
  { icon: AtSign, label: 'Social' },
  { icon: Mail, label: 'Mail' },
];

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-lborder bg-secondary">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div>
            <Logo size="lg" />
            <p className="mt-4 max-w-xs text-sm text-stext">
              Every Run. Every Ball. Live. Your home for cricket live scores, PSL fixtures, teams, players and in-depth statistics.
            </p>
            <div className="mt-5 flex gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href="#"
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
              <ul className="space-y-2.5">
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
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-lborder pt-6 text-xs text-stext sm:flex-row">
          <p>
            © 2026 PAK CRICZONE. All rights reserved. Sample and mock score data for demonstration only.
          </p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-accent">Privacy</Link>
            <Link href="/terms" className="hover:text-accent">Terms</Link>
            <Link href="/contact" className="hover:text-accent">Contact</Link>
          </div>
        </div>
        <p className="mt-4 text-center text-[11px] text-stext/60">
          Developed by <span className="font-semibold text-stext/80">D Design Agency</span>
        </p>
      </div>
    </footer>
  );
}