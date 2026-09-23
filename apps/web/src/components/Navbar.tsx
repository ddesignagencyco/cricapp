'use client';

import { useEffect, useRef, useState, type ComponentType, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity,
  Award,
  Bell,
  Calendar,
  Globe,
  Heart,
  Home,
  Images,
  LayoutDashboard,
  LogIn,
  LogOut,
  Moon,
  Newspaper,
  Radio,
  Search,
  Shield,
  ShieldCheck,
  Sparkles,
  Sun,
  Trophy,
  Wrench,
  User,
  UserPlus,
  UserRound,
  X,
} from 'lucide-react';
import Logo from './Logo';
import SearchBar from './SearchBar';
import RemoteImage from './RemoteImage';
import { useTheme } from './ThemeProvider';
import { useAuth } from './AuthProvider';
import { getInitials } from '../utils/helpers';

type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number; className?: string }>;
};

const liveItems: NavItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/matches', label: 'Matches', icon: Activity },
  { to: '/predictions', label: 'Predictions', icon: Sparkles },
  { to: '/streams', label: 'Streams', icon: Radio },
  { to: '/schedules', label: 'Schedule', icon: Calendar },
];

const exploreItems: NavItem[] = [
  { to: '/teams', label: 'Teams', icon: Shield },
  { to: '/players', label: 'Players', icon: UserRound },
  { to: '/psl', label: 'PSL', icon: Trophy },
  { to: '/tools', label: 'Tools', icon: Wrench },
  { to: '/tours', label: 'Tours', icon: Globe },
  { to: '/tournaments', label: 'Tournaments', icon: Award },
  { to: '/news', label: 'News', icon: Newspaper },
  { to: '/gallery', label: 'Gallery', icon: Images },
];

const navItems = [...liveItems, ...exploreItems];

function avatarHue(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return Math.abs(h % 360);
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = () => {
    if (menuCloseTimer.current) clearTimeout(menuCloseTimer.current);
    setMenuOpen(true);
  };

  const closeMenuSoon = () => {
    if (menuCloseTimer.current) clearTimeout(menuCloseTimer.current);
    menuCloseTimer.current = setTimeout(() => setMenuOpen(false), 140);
  };

  const toggleMenu = () => {
    if (menuCloseTimer.current) clearTimeout(menuCloseTimer.current);
    setMenuOpen((open) => !open);
  };
  const pathname = usePathname();
  const router = useRouter();
  const { theme, toggle, mounted } = useTheme();
  const { user, isAdmin, isSuperAdmin, isAuthenticated, logout } = useAuth();

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onToggle = () => {
      setMobileOpen((open) => !open);
      setMenuOpen(false);
      setSearchOpen(false);
    };
    window.addEventListener('pcz:toggle-menu', onToggle);
    return () => window.removeEventListener('pcz:toggle-menu', onToggle);
  }, []);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent('pcz:menu-state', { detail: mobileOpen }));
  }, [mobileOpen]);

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
      if (menuCloseTimer.current) clearTimeout(menuCloseTimer.current);
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
  const hue = avatarHue(displayName);

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
    <header className="site-chrome sticky top-0 z-40 h-14 shrink-0 border-b">
      <a
        href="#main-content"
        className="btn-brand fixed left-3 top-3 z-50 -translate-y-20 rounded px-3 py-2 text-sm font-medium focus:translate-y-0"
      >
        Skip to content
      </a>
      <nav className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
        <Logo size="lg" />

        <div className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              href={item.to}
              aria-current={isActive(item.to) ? 'page' : undefined}
              className={`site-nav-link relative px-3 py-2 text-sm font-medium transition-colors ${isActive(item.to)
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
              className="site-nav-icon icon-btn h-9 w-9 text-stext"
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
            className="site-nav-icon icon-btn h-9 w-9 text-stext"
            aria-label="Search"
          >
            <Search size={18} />
          </button>
          {isAuthenticated && user ? (
            <div
              ref={menuRef}
              className="relative hidden lg:block"
              onMouseEnter={openMenu}
              onMouseLeave={closeMenuSoon}
            >
              <button
                type="button"
                onClick={toggleMenu}
                className={`site-nav-icon icon-btn h-9 w-9 ${
                  menuOpen ? 'bg-card text-accent' : 'text-stext'
                }`}
                aria-label="Account menu"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <User size={18} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-50 pt-2">
                <div
                  role="menu"
                  className="elev-overlay z-[60] w-72 overflow-hidden rounded-md border border-lborder bg-elevated"
                >
                  <div className="border-b border-lborder bg-elevated/70 px-3.5 py-3.5">
                    <div className="flex items-center gap-3">
                      <ProfileAvatar name={displayName} src={user.avatarUrl} hue={hue} size={40} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-mtext">{user.displayName || user.username}</p>
                        <p className="truncate text-xs text-stext">@{user.username}</p>
                        <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {isSuperAdmin ? (
                        <span className="inline-flex items-center gap-1 rounded bg-[var(--color-brand)] px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-[var(--color-brand-fg)]">
                          <ShieldCheck size={10} /> Superadmin
                        </span>
                      ) : isAdmin ? (
                        <span className="inline-flex items-center gap-1 rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-accent">
                          <ShieldCheck size={10} /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded bg-secondary px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-stext">
                          Member
                        </span>
                      )}
                      {user.emailVerified && (
                        <span className="inline-flex items-center rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-accent">
                          Verified
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-1.5">
                    <ProfileMenuLink href="/profile" icon={User} label="Profile" hint="Account details" active={pathname.startsWith('/profile')} />
                    <ProfileMenuLink href="/favorites" icon={Heart} label="Favorites" hint="Saved teams and players" active={pathname.startsWith('/favorites')} />
                    <ProfileMenuLink href="/settings/notifications" icon={Bell} label="Notifications" hint="Alerts and devices" active={pathname.startsWith('/settings/notifications')} />
                    {isAdmin && (
                      <ProfileMenuLink href="/admin" icon={LayoutDashboard} label="CMS Dashboard" hint="Manage the site" active={pathname.startsWith('/admin')} />
                    )}
                  </div>
                  <div className="border-t border-lborder p-1.5">
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 rounded-md px-2.5 py-2 text-left text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
                    >
                      <span className="grid h-8 w-8 place-items-center rounded-md bg-danger/10">
                        <LogOut size={15} />
                      </span>
                      Sign out
                    </button>
                  </div>
                </div>
                </div>
              )}
            </div>
          ) : (
            <div
              ref={menuRef}
              className="relative hidden lg:block"
              onMouseEnter={openMenu}
              onMouseLeave={closeMenuSoon}
            >
              <button
                type="button"
                onClick={() => {
                  toggleMenu();
                  setMobileOpen(false);
                }}
                className={`site-nav-icon icon-btn h-9 w-9 ${
                  menuOpen || pathname.startsWith('/login') || pathname.startsWith('/register')
                    ? 'bg-card text-accent'
                    : 'text-stext'
                }`}
                aria-label="Sign in menu"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <User size={18} />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full z-50 pt-2">
                <div
                  role="menu"
                  className="elev-overlay z-[60] w-72 overflow-hidden rounded-md border border-lborder bg-elevated"
                >
                  <div className="border-b border-lborder bg-elevated/70 px-3.5 py-3.5">
                    <p className="text-sm font-semibold text-mtext">Welcome to PakCricZone</p>
                    <p className="mt-1 text-xs leading-relaxed text-stext">
                      Sign in to save favorites, comment on matches, and follow live scores.
                    </p>
                  </div>
                  <div className="space-y-1.5 p-2">
                    <Link
                      href="/login"
                      role="menuitem"
                      className="btn-brand flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold"
                      onClick={() => setMenuOpen(false)}
                    >
                      <LogIn size={15} />
                      Sign in
                    </Link>
                    <Link
                      href="/register"
                      role="menuitem"
                      className="flex items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold text-mtext transition-colors hover:bg-[var(--color-row-hover)]"
                      style={{ border: '1px solid var(--color-lborder)' }}
                      onClick={() => setMenuOpen(false)}
                    >
                      <UserPlus size={15} />
                      Create account
                    </Link>
                  </div>
                  <div className="border-t border-lborder px-3.5 py-2.5">
                    <Link
                      href="/forgot-password"
                      className="text-xs font-medium text-stext hover:text-accent"
                      onClick={() => setMenuOpen(false)}
                    >
                      Forgot password?
                    </Link>
                  </div>
                </div>
                </div>
              )}
            </div>
          )}

        </div>
      </nav>
    </header>

      {searchOpen && <SearchBar autoFocus onDone={() => setSearchOpen(false)} />}

      {mobileOpen && (
        <>
          <button
            type="button"
            className="fixed inset-x-0 top-14 bottom-14 z-[25] bg-black/50 lg:hidden"
            aria-label="Close menu"
            onClick={closeMobile}
          />
          <div
            id="mobile-navigation"
            className="fixed inset-x-0 top-14 bottom-14 z-[30] overflow-y-auto border-t border-lborder bg-primary text-mtext lg:hidden"
          >
            <div className="mx-auto max-w-7xl px-4 pb-8 pt-4 sm:px-6">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold text-mtext">Browse</p>
                <button
                  type="button"
                  onClick={closeMobile}
                  className="grid h-9 w-9 place-items-center rounded text-stext hover:bg-[var(--color-row-hover)] hover:text-mtext"
                  aria-label="Close more menu"
                >
                  <X size={18} />
                </button>
              </div>
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
                      <ProfileAvatar name={displayName} src={user.avatarUrl} hue={hue} size={40} />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-mtext">{user.displayName || user.username}</p>
                        <p className="truncate text-xs text-stext">@{user.username}</p>
                        <p className="truncate text-xs font-medium text-muted-foreground">{user.email}</p>
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
                      className="flex w-full items-center gap-3 rounded px-3 py-3 text-left text-sm font-semibold text-danger hover:bg-[var(--color-row-hover)]"
                    >
                      <span className="grid h-9 w-9 place-items-center rounded bg-danger/10">
                        <LogOut size={16} />
                      </span>
                      Sign out
                    </button>
                  </>
                ) : (
                  <div className="space-y-2 rounded border border-lborder bg-card p-3">
                    <p className="text-sm font-semibold text-mtext">Welcome to PakCricZone</p>
                    <p className="text-xs text-stext">Sign in to save favorites and comment on matches.</p>
                    <Link
                      href="/login"
                      className="btn-brand flex items-center justify-center gap-2 rounded px-4 py-2.5 text-sm font-semibold"
                    >
                      <LogIn size={16} />
                      Sign in
                    </Link>
                    <Link
                      href="/register"
                      className="flex items-center justify-center gap-2 rounded px-4 py-2.5 text-sm font-semibold text-mtext"
                      style={{ border: '1px solid var(--color-lborder)' }}
                    >
                      <UserPlus size={16} />
                      Create account
                    </Link>
                  </div>
                )}
              </MobileSection>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function ProfileAvatar({
  name,
  src,
  hue,
  size,
}: {
  name: string;
  src?: string | null;
  hue: number;
  size: number;
}) {
  if (src) {
    return (
      <RemoteImage
        src={src}
        alt={name}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover ring-1 ring-lborder"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full text-xs font-bold text-white ring-1 ring-white/10"
      style={{
        width: size,
        height: size,
        backgroundImage: `linear-gradient(135deg, hsl(${hue}, 75%, 50%), hsl(${(hue + 40) % 360}, 85%, 35%))`,
      }}
    >
      {getInitials(name)}
    </span>
  );
}

function ProfileMenuLink({
  href,
  icon: Icon,
  label,
  hint,
  active,
}: {
  href: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  label: string;
  hint: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-3 rounded-md px-2.5 py-2 transition-colors ${
        active ? 'bg-accent/10 text-accent' : 'text-mtext hover:bg-[var(--color-row-hover)]'
      }`}
    >
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${
          active ? 'bg-accent/15 text-accent' : 'bg-elevated text-stext'
        }`}
      >
        <Icon size={15} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{label}</span>
        <span className={`block text-xs font-medium ${active ? 'text-accent' : 'text-muted-foreground'}`}>{hint}</span>
      </span>
    </Link>
  );
}

function MobileSection({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="mb-5 last:mb-0">
      <p className="px-1 text-[11px] font-bold uppercase tracking-wider text-stext">{label}</p>
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
      className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors ${
        active ? 'bg-accent/10 text-accent' : 'text-mtext hover:bg-[var(--color-row-hover)]'
      }`}
    >
      <span
        className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${
          active ? 'bg-accent/15 text-accent' : 'bg-secondary text-stext'
        }`}
      >
        <Icon size={16} />
      </span>
      {item.label}
    </Link>
  );
}
