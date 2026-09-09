import type { ReactNode } from 'react';
import Link from 'next/link';

interface AuthShellProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <div className="relative mx-auto flex min-h-[calc(100vh-8rem)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-24 left-1/4 h-64 w-64 rounded-full bg-accent/10 blur-[100px]" />
        <div className="absolute -bottom-16 right-1/4 h-56 w-56 rounded-full bg-accent2/10 blur-[90px]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-6 text-center">
          <Link href="/" className="inline-block text-xl font-black tracking-tight">
            <span className="text-mtext">PAK CRIC</span>
            <span className="text-accent">ZONE</span>
          </Link>
          <h1 className="mt-4 text-lg font-bold tracking-tight text-mtext sm:text-xl">{title}</h1>
          <p className="mt-1 text-xs text-stext sm:text-sm">{subtitle}</p>
        </div>

        <div className="rounded-2xl bg-card p-6 ring-1 ring-lborder sm:p-7">
          {children}
        </div>

        {footer && <div className="mt-5 text-center text-sm text-stext">{footer}</div>}
      </div>
    </div>
  );
}
