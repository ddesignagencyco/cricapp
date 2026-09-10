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
  Loader2,
  Menu,
  X,
  LogOut,
  Eye,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '../../../components/AuthProvider';
import { useTheme } from '../../../components/ThemeProvider';

const adminNav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/news', label: 'Articles', icon: FileText },
  { to: '/admin/categories', label: 'Categories', icon: Tag },
  { to: '/admin/matches', label: 'Matches', icon: Trophy },
  { to: '/admin/teams', label: 'Teams', icon: Users },
  { to: '/admin/players', label: 'Players', icon: UserCircle },
  { to: '/admin/tournaments', label: 'Tournaments', icon: Newspaper },
  { to: '/admin/media', label: 'Media Library', icon: ImageIcon },
  { to: '/admin/comments', label: 'Comments', icon: MessageSquare },
  { to: '/admin/users', label: 'Users', icon: UserCircle },
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

  if (loading || !mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--admin-bg)' }}>
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--admin-accent)' }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--admin-bg)' }}>
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--admin-accent)' }} />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: 'var(--admin-bg)' }}>
        <div className="mx-auto max-w-md px-4 text-center">
          <ShieldAlert size={40} className="mx-auto" style={{ color: 'var(--admin-danger)' }} />
          <h1 className="mt-4 text-lg font-bold" style={{ color: 'var(--admin-text)' }}>Admin access required</h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--admin-text-secondary)' }}>Your account does not have permission to open the CMS.</p>
          <Link href="/" className="mt-6 inline-block rounded-lg px-5 py-2.5 text-sm font-bold text-white" style={{ background: 'var(--admin-accent)' }}>
            Back to homepage
          </Link>
        </div>
      </div>
    );
  }

  const isActive = (to: string) => (to === '/admin' ? pathname === '/admin' : pathname.startsWith(to));
  const userName = user?.displayName || user?.username || 'Admin';
  const userInitials = userName.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

  const sidebar = (
    <div className="flex h-full flex-col" style={{ width: 220, minWidth: 220, background: 'var(--admin-sidebar)' }}>
      <div className="flex h-14 items-center gap-2.5 px-4" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div className="grid h-8 w-8 place-items-center rounded-lg text-xs font-black text-white" style={{ background: 'var(--color-brand)' }}>PC</div>
        <div>
          <p className="text-xs font-bold text-white leading-tight">PAK CRICZONE</p>
          <p className="text-[10px] uppercase tracking-wider text-slate-400">CMS Admin</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {adminNav.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.to);
          return (
            <Link
              key={item.to}
              href={item.to}
              aria-current={active ? 'page' : undefined}
              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors"
              style={{
                background: active ? 'var(--color-brand)' : 'transparent',
                color: active ? '#FFFFFF' : '#94A3B8',
              }}
            >
              <Icon size={16} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <button
          type="button"
          onClick={() => { logout(); router.push('/'); }}
          className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] transition-colors text-slate-400 hover:text-white"
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
        >
          <LogOut size={15} />
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
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.5)' }}
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
        />
      )}

      {/* Mobile sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-200 lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="relative">
          <button type="button" onClick={() => setMobileOpen(false)}
            className="absolute right-2 top-3 z-10 grid h-8 w-8 place-items-center rounded-lg text-white/60 hover:text-white"
            aria-label="Close navigation">
            <X size={18} />
          </button>
          {sidebar}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col lg:pl-[220px]">
        {/* Top bar */}
        <header className="sticky top-0 z-20 flex h-14 items-center gap-4 px-4 sm:px-6" style={{ background: 'var(--admin-topbar)', borderBottom: '1px solid var(--admin-border)' }}>
          <button type="button" onClick={() => setMobileOpen(true)}
            className="grid h-9 w-9 place-items-center rounded-lg lg:hidden" style={{ color: 'var(--admin-text-secondary)' }}
            aria-label="Open navigation" aria-expanded={mobileOpen}>
            <Menu size={18} />
          </button>

          <div className="flex-1" />

          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggle}
            className="grid h-9 w-9 place-items-center rounded-lg transition-colors"
            style={{ color: 'var(--admin-text-secondary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--admin-input-bg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>

          <a href="/" target="_blank"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{ border: '1px solid var(--admin-border)', color: 'var(--admin-text-secondary)' }}
            rel="noopener noreferrer">
            <Eye size={14} />
            View site
          </a>

          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full text-xs font-bold text-white" style={{ background: 'var(--admin-accent)' }}>
              {userInitials}
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-semibold" style={{ color: 'var(--admin-text)' }}>{userName}</p>
              <p className="text-xs" style={{ color: 'var(--admin-text-secondary)' }}>{user?.isAdmin ? 'Administrator' : 'Editor'}</p>
            </div>
          </div>
        </header>

        <main id="admin-content" className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
