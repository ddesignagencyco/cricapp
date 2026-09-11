'use client';

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  Award,
  Bell,
  Calendar,
  ChevronDown,
  Globe,
  Heart,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Newspaper,
  Radio,
  Search,
  Shield,
  ShieldCheck,
  Sun,
  Trophy,
  User,
  UserRound,
  X,
} from 'lucide-react';
import Logo from './Logo';
import SearchBar from './SearchBar';
import { useTheme } from './ThemeProvider';
import { useAuth } from './AuthProvider';

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
};

const liveItems: NavItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/matches', label: 'Matches', icon: Activity },
  { to: '/streams', label: 'Streams', icon: Radio },
  { to: '/schedules', label: 'Schedule', icon: Calendar },
];

const exploreItems: NavItem[] = [
  { to: '/teams', label: 'Teams', icon: Shield },
  { to: '/players', label: 'Players', icon: UserRound },
  { to: '/psl', label: 'PSL', icon: Trophy },
  { to: '/tours', label: 'Tours', icon: Globe },
  { to: '/tournaments', label: 'Tournaments', icon: Award },
  { to: '/news', label: 'News', icon: Newspaper },
];

const navItems = [...liveItems, ...exploreItems];

function UserAvatar({ name, src, size = 36 }: { name: string; src?: string | null; size?: number }) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);
  const initials = name.includes(' ')
    ? name.split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 2)
    : name.slice(0, 2).toUpperCase();

  if (src) {
    return (
      <img
        src={src}
        alt=""
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <span
      className="grid shrink-0 place-items-center rounded-full font-bold text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        backgroundImage: `linear-gradient(135deg, hsl(${hue}, 75%, 50%), hsl(${(hue + 40) % 360}, 85%, 35%))`,
      }}
    >
      {initials}
    </span>
  );
}

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

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    setMobileOpen(false);
    router.push('/');
  };

  const isActive = (to: string) => (to === '/' ? pathname === '/' : pathname.startsWith(to));
  const displayName = (user?.displayName || user?.username || user?.email || '').trim();

  const closeMobile = () => setMobileOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-lborder bg-primary/95 backdrop-blur-md">
      <a
        href="#main-content"
        className="btn-brand fixed left-3 top-3 z-50 -translate-y-20 rounded px-3 py-2 text-sm font-medium focus:translate-y-0"
      >
        Skip to content
      </a>
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2 sm:px-6">
        <Logo width={132} height={42} />

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
              className="grid h-9 w-9 place-items-center rounded text-stext transition-colors hover:bg-card hover:text-mtext"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setSearchOpen((s) => !s);
              setMobileOpen(false);
            }}
            className="grid h-9 w-9 place-items-center rounded text-stext transition-colors hover:bg-card hover:text-mtext"
            aria-label="Search"
          >
            <Search size={18} />
          </button>
          {isAuthenticated && user ? (
            <div ref={menuRef} className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setMenuOpen((s) => !s)}
                className={`flex h-9 items-center gap-0.5 rounded px-2 transition-colors hover:bg-card hover:text-mtext ${
                  menuOpen ? 'bg-card text-mtext' : 'text-stext'
                }`}
                aria-label="Account menu"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <User size={18} />
                <ChevronDown size={14} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
              </button>
              {menuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-lg bg-elevated py-1 shadow-xl ring-1 ring-lborder"
                >
                  <div className="flex items-start gap-3 border-b border-lborder px-3.5 py-3">
                    <span className="mt-0.5">
                      <UserAvatar name={displayName || user.username} src={user.avatarUrl} size={36} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-mtext">{displayName || user.username}</p>
                      <p className="truncate text-xs text-stext">{user.email}</p>
                      {isAdmin && (
                        <span className="mt-1.5 inline-flex items-center gap-1 rounded bg-accent/10 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-accent">
                          <ShieldCheck size={10} /> Admin
                        </span>
                      )}
                    </div>
                  </div>
                  <Link href="/profile" role="menuitem" className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-stext hover:bg-card hover:text-mtext">
                    <User size={15} /> Profile
                  </Link>
                  <Link href="/settings/notifications" role="menuitem" className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-stext hover:bg-card hover:text-mtext">
                    <Bell size={15} /> Notifications
                  </Link>
                  {isAdmin && (
                    <Link href="/admin" role="menuitem" className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-stext hover:bg-card hover:text-mtext">
                      <LayoutDashboard size={15} /> CMS Dashboard
                    </Link>
                  )}
                  <Link href="/favorites" role="menuitem" className="flex items-center gap-2.5 px-3.5 py-2.5 text-sm text-stext hover:bg-card hover:text-mtext">
                    <Heart size={15} /> My Favorites
                  </Link>
                  <button type="button" role="menuitem" onClick={handleLogout} className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-danger hover:bg-card">
                    <LogOut size={15} /> Sign out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className={`hidden h-9 place-items-center rounded px-2 transition-colors hover:bg-card hover:text-mtext sm:grid ${pathname.startsWith('/login') || pathname.startsWith('/register')
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
            onClick={() => {
              setMobileOpen((m) => !m);
              setMenuOpen(false);
              setSearchOpen(false);
            }}
            className="grid h-9 w-9 place-items-center rounded text-mtext transition-colors hover:bg-card lg:hidden"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </nav>

      {searchOpen && <SearchBar autoFocus onDone={() => setSearchOpen(false)} />}

      {mobileOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 top-[3.75rem] z-30 bg-black/50 lg:hidden"
            aria-label="Close menu"
            onClick={closeMobile}
          />
          <div
            id="mobile-navigation"
            className="relative z-40 max-h-[calc(100dvh-3.75rem)] overflow-y-auto border-t border-lborder bg-primary lg:hidden"
          >
            <div className="mx-auto max-w-7xl px-4 pb-8 pt-4 sm:px-6">
              <MobileSection label="Live">
                {liveItems.map((item) => (
                  <MobileNavLink key={item.to} item={item} active={isActive(item.to)} />
                ))}
              </MobileSection>

              <MobileSection label="Explore">
                {exploreItems.map((item) => (
                  <MobileNavLink key={item.to} item={item} active={isActive(item.to)} />
                ))}
              </MobileSection>

              <MobileSection label="Account">
                {isAuthenticated && user ? (
                  <>
                    <div className="mb-1 flex items-center gap-3 rounded border border-lborder bg-card px-3 py-3">
                      <UserAvatar name={displayName || user.username} src={user.avatarUrl} size={40} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-mtext">{displayName || user.username}</p>
                        <p className="truncate text-xs text-stext">{user.email}</p>
                      </div>
                    </div>
                    <MobileNavLink item={{ to: '/profile', label: 'Profile', icon: User }} active={pathname.startsWith('/profile')} />
                    <MobileNavLink item={{ to: '/favorites', label: 'Favorites', icon: Heart }} active={pathname.startsWith('/favorites')} />
                    <MobileNavLink item={{ to: '/settings/notifications', label: 'Notifications', icon: Bell }} active={pathname.startsWith('/settings/notifications')} />
                    {isAdmin && (
                      <MobileNavLink item={{ to: '/admin', label: 'CMS Dashboard', icon: LayoutDashboard }} active={pathname.startsWith('/admin')} />
                    )}
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded px-3 py-3 text-left text-sm font-semibold text-danger hover:bg-card"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded bg-danger/10">
                        <LogOut size={16} />
                      </span>
                      Sign out
                    </button>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="btn-brand mt-1 flex items-center justify-center gap-2 rounded px-4 py-3 text-sm font-semibold"
                  >
                    <User size={16} />
                    Sign in
                  </Link>
                )}
              </MobileSection>
            </div>
          </div>
        </>
      )}
    </header>
  );
}

function MobileSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mb-5 last:mb-0">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-wider text-stext">{label}</p>
      <div className="mt-2 space-y-0.5">{children}</div>
    </section>
  );
}

function MobileNavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.to}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 rounded px-3 py-2.5 text-sm font-semibold transition-colors ${
        active ? 'bg-accent/10 text-accent' : 'text-mtext hover:bg-card'
      }`}
    >
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded ${
          active ? 'bg-accent/15 text-accent' : 'bg-card text-stext'
        }`}
      >
        <Icon size={16} />
      </span>
      {item.label}
    </Link>
  );
}
