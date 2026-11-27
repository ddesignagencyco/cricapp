'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import {
  LayoutDashboard,
  FileText,
  FilePlus2,
  Tag,
  PenLine,
  ScrollText,
  ShieldAlert,
  Menu,
  X,
  LogOut,
  Eye,
  Sun,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
} from 'lucide-react';
import { useAuth } from '../../../components/AuthProvider';
import { useTheme } from '../../../components/ThemeProvider';
import Logo from '../../../components/Logo';
import { AdminAvatar } from '../../../components/admin/AdminShared';
import { AdminChromeSkeleton } from '../../../components/skeletons/Skeletons';

const SIDEBAR_KEY = 'pcz.editorial.sidebarCollapsed';

export default function EditorialLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, hasEditorialAccess, isEditor, isAdmin, loading, user, logout } = useAuth();
  const { theme, toggle, mounted } = useTheme();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(SIDEBAR_KEY) === '1') setCollapsed(true);
    } catch {
      // Storage blocked.
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0');
      } catch {
        // Ignore storage errors.
      }
      return next;
    });
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login?returnTo=/editorial');
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileOpen]);

  if (loading || !mounted || !isAuthenticated) {
    return <AdminChromeSkeleton />;
  }

  if (!hasEditorialAccess) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--admin-bg)' }}>
        <div className="mx-auto max-w-md px-4 text-center">
          <ShieldAlert size={40} className="mx-auto" style={{ color: 'var(--admin-danger)' }} />
          <h1 className="mt-4 text-lg font-bold" style={{ color: 'var(--admin-text)' }}>
            Editorial access required
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>
            Your account does not have an Author or Editor role to open the Editorial Studio.
          </p>
          <Link href="/" className="btn-brand mt-6 inline-block rounded-lg px-5 py-2.5 text-sm font-bold">
            Back to homepage
          </Link>
        </div>
      </div>
    );
  }

  const navItems = [
    { to: '/editorial', label: 'Overview', icon: LayoutDashboard },
    { to: '/editorial/articles', label: isEditor ? 'All Articles' : 'My Articles', icon: FileText },
    { to: '/editorial/articles/new', label: 'Write Article', icon: FilePlus2 },
    { to: '/editorial/profile', label: 'Author Profile', icon: PenLine },
    ...(isEditor
      ? [
          { to: '/editorial/categories', label: 'Categories', icon: Tag },
          { to: '/editorial/pages', label: 'Editorial Pages', icon: ScrollText },
        ]
      : []),
  ];

  const isActive = (to: string) => {
    if (to === '/editorial') return pathname === '/editorial';
    if (to === '/editorial/articles') {
      return pathname === '/editorial/articles' || (pathname.startsWith('/editorial/articles/') && pathname !== '/editorial/articles/new');
    }
    return pathname === to || pathname.startsWith(`${to}/`);
  };

  const userName = user?.displayName || user?.username || 'Author';
  const roleLabel = user?.isSuperAdmin
    ? 'Superadmin'
    : user?.isAdmin
      ? 'Administrator'
      : isEditor
        ? 'Editor'
        : 'Author';

  const renderSidebar = (rail: boolean) => (
    <div
      className={`flex h-full min-h-0 w-full shrink-0 flex-col transition-[width] duration-200 ${rail ? 'lg:w-[72px]' : 'lg:w-[240px]'}`}
      style={{
        width: rail ? '72px' : 'min(240px, 84vw)',
        background: 'var(--admin-sidebar)',
        borderRight: '1px solid var(--admin-sidebar-border)',
      }}
    >
      <div
        className="flex h-16 shrink-0 items-center justify-center overflow-hidden px-3"
        style={{ borderBottom: '1px solid var(--admin-sidebar-border)' }}
      >
        <Logo to="/editorial" size={rail ? 'sm' : 'md'} variant={rail ? 'icon' : theme === 'light' ? 'light' : 'dark'} />
      </div>

      <nav className={`flex-1 overflow-y-auto no-scrollbar py-3 space-y-0.5 ${rail ? 'px-2' : 'px-3'}`} aria-label="Editorial sections">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              href={item.to}
              aria-current={active ? 'page' : undefined}
              title={rail ? item.label : undefined}
              aria-label={rail ? item.label : undefined}
              className={`admin-nav-link flex items-center gap-3 rounded-md py-2.5 text-sm font-semibold transition-colors duration-150 ${rail ? 'justify-center px-0' : 'px-3'}`}
              style={{
                background: active ? 'var(--admin-sidebar-active)' : 'transparent',
                color: active ? 'var(--admin-sidebar-active-fg)' : 'var(--admin-sidebar-muted)',
              }}
            >
              <Icon size={18} aria-hidden="true" className="shrink-0" />
              {rail ? null : <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className={`py-3 ${rail ? 'px-2' : 'px-3'}`} style={{ borderTop: '1px solid var(--admin-sidebar-border)' }}>
        {isAdmin && (
          <Link
            href="/admin"
            title={rail ? 'Admin Panel' : undefined}
            className={`admin-nav-link flex w-full items-center gap-3 rounded-md py-2 text-xs font-semibold transition-colors duration-150 ${rail ? 'justify-center px-0' : 'px-3'}`}
            style={{ color: 'var(--admin-sidebar-muted)' }}
          >
            <Settings2 size={16} aria-hidden="true" className="shrink-0" />
            {rail ? null : 'Admin Panel'}
          </Link>
        )}
        <button
          type="button"
          onClick={() => {
            logout();
            router.push('/');
          }}
          title={rail ? 'Logout' : undefined}
          aria-label={rail ? 'Logout' : undefined}
          className={`admin-nav-link mt-1 flex w-full items-center gap-3 rounded-md py-2.5 text-sm font-semibold transition-colors duration-150 ${rail ? 'justify-center px-0' : 'px-3'}`}
          style={{ color: 'var(--admin-sidebar-muted)' }}
        >
          <LogOut size={18} aria-hidden="true" className="shrink-0" />
          {rail ? null : 'Logout'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="admin-shell flex min-h-screen" style={{ background: 'var(--admin-bg)' }}>
      <aside
        id="editorial-desktop-nav"
        className="hidden lg:flex flex-col fixed inset-y-0 left-0 z-30"
        style={{ background: 'var(--admin-sidebar)', borderRight: '1px solid var(--admin-border)' }}
      >
        {renderSidebar(collapsed)}
      </aside>

      {mobileOpen && (
        <button
          type="button"
          className="scrim fixed inset-0 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      <div
        id="editorial-mobile-nav"
        aria-hidden={!mobileOpen}
        className={`fixed inset-y-0 left-0 z-50 flex h-dvh transform transition-transform duration-200 lg:hidden ${mobileOpen ? 'translate-x-0' : 'pointer-events-none -translate-x-full'}`}
      >
        <div className="relative flex h-full min-h-0 flex-col">
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="on-media absolute right-2 top-3 z-10 grid h-8 w-8 place-items-center rounded-md transition-colors hover:bg-[var(--admin-sidebar-hover)]"
            style={{ color: 'var(--admin-sidebar-muted)' }}
            aria-label="Close navigation"
          >
            <X size={18} aria-hidden="true" />
          </button>
          {renderSidebar(false)}
        </div>
      </div>

      <div className={`flex min-w-0 flex-1 flex-col transition-[padding] duration-200 ${collapsed ? 'lg:pl-[72px]' : 'lg:pl-[240px]'}`}>
        <header
          className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 px-3 sm:gap-4 sm:px-6"
          style={{ background: 'var(--admin-topbar)', borderBottom: '1px solid var(--admin-border)' }}
        >
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="admin-icon-btn grid h-9 w-9 shrink-0 place-items-center rounded-md lg:hidden"
            aria-label="Open navigation"
          >
            <Menu size={18} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="admin-icon-btn hidden h-9 w-9 shrink-0 place-items-center rounded-md lg:grid"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
          </button>

          <span className="hidden text-xs font-bold uppercase tracking-wider sm:inline" style={{ color: 'var(--admin-text-muted)' }}>
            Editorial Studio
          </span>

          <div className="min-w-0 flex-1" />

          <button
            type="button"
            onClick={toggle}
            className="admin-icon-btn grid h-9 w-9 shrink-0 place-items-center rounded-md"
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
          </button>

          <a
            href="/news"
            target="_blank"
            className="admin-icon-btn inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-semibold sm:px-3"
            style={{ border: '1px solid var(--admin-border)' }}
            rel="noopener noreferrer"
          >
            <Eye size={14} aria-hidden="true" />
            <span className="hidden sm:inline">View news</span>
          </a>

          <div className="flex shrink-0 items-center gap-2">
            <AdminAvatar name={userName} src={user?.avatarUrl} size={32} />
            <div className="hidden min-w-0 sm:block">
              <p className="truncate text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>
                {userName}
              </p>
              <p className="truncate text-xs font-medium" style={{ color: 'var(--admin-text-secondary)' }}>
                {roleLabel}
              </p>
            </div>
          </div>
        </header>

        <main id="editorial-content" className="min-w-0 flex-1 overflow-x-clip p-3 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
