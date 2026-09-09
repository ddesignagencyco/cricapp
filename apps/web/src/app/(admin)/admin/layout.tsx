'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { FileText, LayoutDashboard, Loader2, ShieldAlert, Tag } from 'lucide-react';
import Logo from '../../../components/Logo';
import { useAuth } from '../../../components/AuthProvider';

const adminNav = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/news', label: 'All Articles', icon: FileText },
  { to: '/admin/categories', label: 'Categories', icon: Tag },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login?returnTo=/admin');
    }
  }, [loading, isAuthenticated, router]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={26} className="animate-spin text-accent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 size={26} className="animate-spin text-accent" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center">
        <ShieldAlert size={40} className="text-danger" />
        <h1 className="mt-4 text-lg font-bold text-mtext">Admin access required</h1>
        <p className="mt-1 text-sm text-stext">Your account does not have permission to open the CMS.</p>
        <Link href="/" className="mt-6 rounded bg-accent px-5 py-2.5 text-sm font-bold text-white hover:bg-accent2">
          Back to homepage
        </Link>
      </div>
    );
  }

  const isActive = (to: string) => (to === '/admin' ? pathname === '/admin' : pathname.startsWith(to));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-lborder bg-card p-2 shadow-sm">
            <p className="px-3 pt-2 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-stext">
              Admin Panel
            </p>
            <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
              {adminNav.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to);
                return (
                  <Link
                    key={item.to}
                    href={item.to}
                    className={`flex shrink-0 items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs font-bold transition-all ${active
                      ? 'bg-accent text-white shadow-md shadow-accent/20'
                      : 'text-stext hover:bg-secondary hover:text-mtext'
                      }`}
                  >
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
