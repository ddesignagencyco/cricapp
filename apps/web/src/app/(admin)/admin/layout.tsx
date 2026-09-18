'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  FileText,
  Tag,
  Trophy,
  Users,
  UserCircle,
  Newspaper,
  MessageSquare,
  Image as ImageIcon,
  Settings,
  ShieldAlert,
  Menu,
  X,
  LogOut,
  Eye,
  Sun,
  Moon,
  Radio,
  PenLine,
  ScrollText,
  Inbox,
  Mail,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../../components/AuthProvider';
import { useTheme } from '../../../components/ThemeProvider';
import Logo from '../../../components/Logo';
import { AdminAvatar } from '../../../components/admin/AdminShared';
import { AdminChromeSkeleton } from '../../../components/skeletons/Skeletons';

const adminNav = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/authors', label: 'Authors', icon: PenLine },
  { to: '/admin/categories', label: 'Categories', icon: Tag },
  { to: '/admin/news', label: 'News', icon: FileText },
  { to: '/admin/comments', label: 'Comments', icon: MessageSquare },
  { to: '/admin/gallery', label: 'Gallery', icon: ImageIcon },
  { to: '/admin/teams', label: 'Teams', icon: Users },
  { to: '/admin/players', label: 'Players', icon: UserCircle },
  { to: '/admin/matches', label: 'Matches', icon: Trophy },
  { to: '/admin/predictions', label: 'Predictions', icon: Sparkles },
  { to: '/admin/tournaments', label: 'Tournaments', icon: Newspaper },
  { to: '/admin/streams', label: 'Streams', icon: Radio },
  { to: '/admin/users', label: 'Users', icon: UserCircle },
  { to: '/admin/newsletter', label: 'Newsletter', icon: Mail },
  { to: '/admin/editorial', label: 'Editorial', icon: ScrollText },
  { to: '/admin/contact', label: 'Contact', icon: Inbox },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin, loading, user, logout } = useAuth();
  const { theme, toggle, mounted } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login?returnTo=/admin');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  if (loading || !mounted || !isAuthenticated) {
    return <AdminChromeSkeleton />;
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--admin-bg)' }}>
        <div className="mx-auto max-w-md px-4 text-center">
          <ShieldAlert size={40} className="mx-auto" style={{ color: 'var(--admin-danger)' }} />
          <h1 className="mt-4 text-lg font-bold" style={{ color: 'var(--admin-text)' }}>Admin access required</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>Your account does not have permission to open the CMS.</p>
          <Link href="/" className="btn-brand mt-6 inline-block rounded-lg px-5 py-2.5 text-sm font-bold">
            Back to homepage
          </Link>
        </div>
      </div>
    );
  }

  const isActive = (to: string) => {
    if (to === '/admin') return pathname === '/admin';
    return pathname === to || pathname.startsWith(`${to}/`);
  };
  const userName = user?.displayName || user?.username || 'Admin';

  const sidebar = (
    <div className="flex h-full min-h-0 w-full flex-col" style={{ width: 240, minWidth: 240, background: 'var(--admin-sidebar)' }}>
      <div className="flex h-14 shrink-0 items-center justify-center px-2" style={{ borderBottom: '1px solid var(--admin-sidebar-border)' }}>
        <Logo to="/admin" size="lg" />
      </div>

      <nav className="flex-1 overflow-y-auto no-scrollbar px-3 py-3 space-y-0.5" aria-label="Admin sections">
        {adminNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              href={item.to}
              aria-current={active ? 'page' : undefined}
              className="admin-nav-link flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors duration-150"
              style={{
                background: active ? 'var(--admin-sidebar-active)' : 'transparent',
                color: active ? 'var(--admin-sidebar-active-fg)' : 'var(--admin-sidebar-muted)',
                boxShadow: active ? 'inset 0 0 0 1px rgba(255, 255, 255, 0.16)' : undefined,
              }}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3" style={{ borderTop: '1px solid var(--admin-sidebar-border)' }}>
        <button
          type="button"
          onClick={() => { logout(); router.push('/'); }}
          className="admin-nav-link mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition-colors duration-150"
          style={{ color: 'var(--admin-sidebar-muted)' }}
        >
          <LogOut size={18} aria-hidden="true" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--admin-bg)' }}>
      <a
        href="#admin-content"
        className="btn-brand fixed left-3 top-3 z-[60] -translate-y-20 rounded px-3 py-2 text-sm font-medium focus:translate-y-0"
      >
        Skip to content
      </a>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-30" style={{ background: 'var(--admin-sidebar)', borderRight: '1px solid var(--admin-border)' }}>
        {sidebar}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          className="scrim fixed inset-0 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      {/* Mobile sidebar */}
      <div
        id="admin-mobile-nav"
        aria-hidden={!mobileOpen}
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh transform transition-transform duration-200 lg:hidden ${mobileOpen ? 'translate-x-0' : 'pointer-events-none -translate-x-full'}`}
      >
        <div className="relative flex h-full min-h-0 flex-col">
          <button type="button" onClick={() => setMobileOpen(false)}
            className="on-media absolute right-2 top-3 z-10 grid h-8 w-8 place-items-center rounded-md transition-colors hover:bg-[var(--admin-sidebar-hover)]"
            style={{ color: 'var(--admin-sidebar-muted)' }}
            aria-label="Close navigation">
            <X size={18} aria-hidden="true" />
          </button>
          {sidebar}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-[240px]">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 px-4 sm:px-6" style={{ background: 'var(--admin-topbar)', borderBottom: '1px solid var(--admin-border)' }}>
          <button type="button" onClick={() => setMobileOpen(true)}
            className="admin-icon-btn grid h-9 w-9 place-items-center rounded-md lg:hidden"
            aria-label="Open navigation" aria-expanded={mobileOpen} aria-controls="admin-mobile-nav">
            <Menu size={18} aria-hidden="true" />
          </button>

          <div className="flex-1" />

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggle}
            className="admin-icon-btn grid h-9 w-9 place-items-center rounded-md"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
          </button>

          <a href="/" target="_blank"
            className="admin-icon-btn inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold"
            style={{ border: '1px solid var(--admin-border)' }}
            rel="noopener noreferrer">
            <Eye size={14} aria-hidden="true" />
            View site
          </a>

          <div className="flex items-center gap-2">
            <AdminAvatar name={userName} src={user?.avatarUrl} size={32} />
            <div className="hidden sm:block">
              <p className="text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>{userName}</p>
              <p className="text-xs font-medium" style={{ color: 'var(--admin-text-secondary)' }}>{user?.isSuperAdmin ? 'Superadmin' : user?.isAdmin ? 'Administrator' : 'Editor'}</p>
            </div>
          </div>
        </header>

        <main id="admin-content" className="min-w-0 flex-1 overflow-x-hidden p-3 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
