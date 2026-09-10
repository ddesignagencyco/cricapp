'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, LogOut, Menu, Moon, Search, ShieldCheck, Sun, User, UserRound, X } from 'lucide-react';
import Logo from './Logo';
import SearchBar from './SearchBar';
import { useTheme } from './ThemeProvider';
import { useAuth } from './AuthProvider';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/matches', label: 'Matches' },
  { to: '/schedules', label: 'Schedule' },
  { to: '/teams', label: 'Teams' },
  { to: '/players', label: 'Players' },
  { to: '/psl', label: 'PSL' },
  { to: '/tours', label: 'Tours' },
  { to: '/tournaments', label: 'Tournaments' },
  { to: '/news', label: 'News' },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle, mounted } = useTheme();
  const { user, isAdmin, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setSearchOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    router.push('/');
  };

  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to));

  return (
    <header className="sticky top-0 z-40 border-b border-lborder bg-primary backdrop-blur-md">
      <a
        href="#main-content"
        className="btn-brand fixed left-3 top-3 z-50 -translate-y-20 rounded px-3 py-2 text-sm font-medium focus:translate-y-0"
      >
        Skip to content
      </a>
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Logo size="lg" />

        <div className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              href={item.to}
              aria-current={isActive(item.to) ? 'page' : undefined}
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
          {isAuthenticated && user ? (
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((s) => !s)}
                className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-card"
                aria-label="Account menu"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                {(() => {
                  const displayName = (user.displayName || user.username || user.email || '').trim();
                  let h = 0;
                  for (let i = 0; i < displayName.length; i++) h = displayName.charCodeAt(i) + ((h << 5) - h);
                  const hue = Math.abs(h % 360);
                  return (
                    <span
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundImage: `linear-gradient(135deg, hsl(${hue}, 75%, 50%), hsl(${(hue + 40) % 360}, 85%, 35%))` }}
                    >
                      {displayName.slice(0, 2).toUpperCase()}
                    </span>
                  );
                })()}
                <span className="hidden max-w-24 truncate text-xs font-semibold text-mtext sm:block">
                  {user.displayName || user.username}
                </span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-52 overflow-hidden rounded bg-elevated py-1 shadow-xl ring-1 ring-lborder">
                  <div className="border-b border-lborder px-3.5 py-2.5">
                    <p className="truncate text-sm font-semibold text-mtext">{user.displayName || user.username}</p>
                    <p className="truncate text-xs text-stext">{user.email}</p>
                    {isAdmin && (
                      <span className="mt-1.5 inline-flex items-center gap-1 rounded bg-accent/10 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-accent">
                        <ShieldCheck size={10} /> Admin
                      </span>
                    )}
                  </div>
                  {isAdmin && (
                    <Link href="/admin" className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-stext hover:bg-card hover:text-mtext">
                      <LayoutDashboard size={15} /> CMS Dashboard
                    </Link>
                  )}
                  <Link href="/favorites" className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-stext hover:bg-card hover:text-mtext">
                    <UserRound size={15} /> My Favorites
                  </Link>
                  <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-danger hover:bg-card">
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className={`grid h-9 w-9 place-items-center rounded-lg transition-colors hover:bg-card hover:text-mtext ${pathname.startsWith('/login') || pathname.startsWith('/register')
                ? 'text-accent'
                : 'text-stext'
                }`}
              aria-label="Sign in"
            >
              <User size={18} />
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((m) => !m)}
            className="grid h-9 w-9 place-items-center rounded-lg text-mtext transition-colors hover:bg-card lg:hidden"
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {searchOpen && <SearchBar autoFocus onDone={() => setSearchOpen(false)} />}

      {mobileOpen && (
        <div id="mobile-navigation" className="border-t border-lborder bg-secondary lg:hidden">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <div className="grid grid-cols-2 gap-1.5">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  href={item.to}
                  aria-current={isActive(item.to) ? 'page' : undefined}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${isActive(item.to)
                    ? 'bg-accent/15 text-accent ring-1 ring-inset ring-accent/25'
                    : 'text-stext hover:bg-card hover:text-mtext'
                    }`}
                >
                  {item.label}
                </Link>
              ))}
              {isAuthenticated && isAdmin && (
                <Link href="/admin" className="rounded-xl bg-accent/15 px-4 py-3 text-sm font-semibold text-accent ring-1 ring-inset ring-accent/25">
                  CMS Dashboard
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
