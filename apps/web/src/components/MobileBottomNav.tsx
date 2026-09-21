'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Activity, Home, Menu, Newspaper, Sparkles } from 'lucide-react';

const items = [
  { to: '/', label: 'Home', icon: Home, match: (path: string) => path === '/' },
  { to: '/matches', label: 'Live', icon: Activity, match: (path: string) => path.startsWith('/matches') },
  { to: '/predictions', label: 'Predict', icon: Sparkles, match: (path: string) => path.startsWith('/predictions') },
  { to: '/news', label: 'News', icon: Newspaper, match: (path: string) => path.startsWith('/news') || path.startsWith('/cricket-news') },
] as const;

export default function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    const onState = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail;
      setMoreOpen(Boolean(detail));
    };
    window.addEventListener('pcz:menu-state', onState);
    return () => window.removeEventListener('pcz:menu-state', onState);
  }, []);

  const toggleMore = () => {
    window.dispatchEvent(new Event('pcz:toggle-menu'));
  };

  return (
    <nav
      className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-lborder bg-primary/95 backdrop-blur-md lg:hidden"
      aria-label="Primary"
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.match(pathname) && !moreOpen;
          return (
            <li key={item.to}>
              <Link
                href={item.to}
                aria-current={active ? 'page' : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold ${
                  active ? 'text-accent' : 'text-stext'
                }`}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            type="button"
            onClick={toggleMore}
            className={`flex min-h-14 w-full flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold ${
              moreOpen ? 'text-accent' : 'text-stext'
            }`}
            aria-label={moreOpen ? 'Close more navigation' : 'Open more navigation'}
            aria-expanded={moreOpen}
            aria-controls="mobile-navigation"
          >
            <Menu size={18} />
            More
          </button>
        </li>
      </ul>
    </nav>
  );
}
