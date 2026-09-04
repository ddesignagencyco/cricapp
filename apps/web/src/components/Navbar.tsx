'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Menu, Moon, Search, Star, Sun, X } from 'lucide-react';
import Logo from './Logo';
import SearchBar from './SearchBar';
import { useTheme } from './ThemeProvider';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/live', label: 'Live' },
  { to: '/streams', label: 'Watch' },
  { to: '/matches', label: 'Matches' },
  { to: '/psl', label: 'PSL' },
  { to: '/news', label: 'News' },
  { to: '/teams', label: 'Teams' },
  { to: '/players', label: 'Players' },
  { to: '/stats', label: 'Stats' },
  { to: '/favorites', label: 'Favorites', icon: Star },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { theme, toggle, mounted } = useTheme();

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setNotifOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

  return (
    <header className="sticky top-0 z-40 border-b border-lborder bg-primary/90 backdrop-blur-md">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Logo />

        <div className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              href={item.to}
              className={`relative px-3 py-2 text-sm font-medium transition-colors ${
                isActive(item.to)
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

          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => setNotifOpen((n) => !n)}
              className="relative grid h-9 w-9 place-items-center rounded-lg text-stext transition-colors hover:bg-card hover:text-mtext"
              aria-label="Notifications"
            >
              <Bell size={18} />
              <span className="absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-danger text-[9px] font-bold text-white">
                3
              </span>
            </button>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-2xl bg-elevated p-3 shadow-xl shadow-shadow/40 ring-1 ring-lborder">
                  <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-widest text-stext">
                    Notifications
                  </p>
                  {[
                    { t: 'Match starting soon', d: 'LQ vs PZ at Gaddafi Stadium \u00B7 Today 7:00 PM', dot: 'upcoming' },
                    { t: 'Fakhar Zaman 50!', d: 'Half-century for Lahore Qalandars opener', dot: 'live' },
                    { t: 'Results updated', d: 'Peshawar Zalmi won by 41 runs', dot: 'done' },
                  ].map((n, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-card"
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          n.dot === 'live'
                            ? 'bg-accent2'
                            : n.dot === 'upcoming'
                              ? 'bg-accent'
                              : 'bg-stext'
                        }`}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-mtext">{n.t}</p>
                        <p className="truncate text-xs text-stext">{n.d}</p>
                      </div>
                    </div>
                  ))}
                  <button
                    type="button"
                    className="mt-2 w-full rounded-lg bg-card py-2 text-xs font-semibold text-accent transition-colors hover:text-accent2"
                  >
                    View all notifications
                  </button>
                </div>
              </>
            )}
          </div>

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
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                    isActive(item.to)
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
