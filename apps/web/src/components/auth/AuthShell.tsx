'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { Flame } from 'lucide-react';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[480px] w-[480px] rounded-full bg-accent/10 blur-[120px]" />
      <div className="pointer-events-none absolute right-1/4 top-1/4 h-[300px] w-[300px] rounded-full bg-emerald-500/10 blur-[100px]" />

      <div className="relative w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-6 text-center">
          <Link href="/" className="inline-flex items-center gap-2 group">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-accent text-white shadow-lg shadow-accent/30 group-hover:scale-105 transition-transform">
              <Flame size={20} />
            </div>
            <div className="text-xl font-black tracking-tight text-left">
              <span className="text-mtext">PAK CRIC</span>
              <span className="text-accent">ZONE</span>
            </div>
          </Link>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-mtext sm:text-3xl">{title}</h1>
          <p className="mt-1.5 text-xs text-stext sm:text-sm">{subtitle}</p>
        </div>

        {/* Card Container */}
        <div className="relative overflow-hidden rounded-3xl border border-lborder bg-gradient-to-b from-card via-card to-elevated p-6 shadow-xl sm:p-8 backdrop-blur-md">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent via-emerald-500 to-accent opacity-80" />
          {children}
        </div>

        {/* Footer Link */}
        {footer && (
          <div className="mt-6 text-center text-xs text-stext sm:text-sm">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
