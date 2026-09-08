'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Menu, Moon, Search, Sun, X } from 'lucide-react';
import Logo from './Logo';
import SearchBar from './SearchBar';
import { useTheme } from './ThemeProvider';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/matches', label: 'Matches' },
  { to: '/psl', label: 'PSL' },
  { to: '/teams', label: 'Teams' },
  { to: '/schedules', label: 'Schedule' },
  { to: '/players', label: 'Players' },
  { to: '/tours', label: 'Tours' },
  { to: '/tournaments', label: 'Tournaments' },
  { to: '/stats', label: 'Stats' },
  { to: '/points-table', label: 'Points Table' },
  // { to: '/streams', label: 'Live Streams' }, // TODO: re-enable later
  // { to: '/news', label: 'News' }, // TODO: re-enable later
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const { theme, toggle, mounted } = useTheme();

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

  return (
    <header className="sticky top-0 z-40 border-b border-lborder bg-primary backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Logo size="lg" />

        <div className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              href={item.to}
              className={`relative px-3 py-2 text-sm font-medium transition-colors ${isActive(item.to)
                ? 'text-accent after:absolute after:inset-x-2 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-accent'
                : 'text-stext hover:text-mtext'
                }`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          {mounted && (
            <button
              type="button"
              onClick={toggle}
              className="grid h-9 w-9 place-items-center rounded-lg text-stext transition-colors hover:bg-card hover:text-mtext"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}

          <button
            type="button"
            onClick={() => setSearchOpen((s) => !s)}
            className="grid h-9 w-9 place-items-center rounded-lg text-stext transition-colors hover:bg-card hover:text-mtext"
            aria-label="Search"
          >
            <Search size={18} />
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((m) => !m)}
            className="grid h-9 w-9 place-items-center rounded-lg text-mtext transition-colors hover:bg-card lg:hidden"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {searchOpen && (
        <div className="border-t border-lborder bg-primary/95 px-4 pb-4 pt-3 backdrop-blur-md">
          <SearchBar autoFocus onDone={() => setSearchOpen(false)} />
        </div>
      )}

      {mobileOpen && (
        <div className="border-t border-lborder bg-secondary lg:hidden">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <div className="grid grid-cols-2 gap-1.5">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  href={item.to}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${isActive(item.to)
                    ? 'bg-accent/15 text-accent ring-1 ring-inset ring-accent/25'
                    : 'text-stext hover:bg-card hover:text-mtext'
                    }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
