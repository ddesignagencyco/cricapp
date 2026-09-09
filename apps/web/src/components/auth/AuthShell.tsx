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
    <div className="mx-auto flex min-h-[calc(100vh-9rem)] max-w-7xl items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-5 text-center">
          <Link href="/" className="inline-block text-xl font-black tracking-tight">
            <span className="text-mtext">PAK CRIC</span>
            <span className="text-accent">ZONE</span>
          </Link>
          <h1 className="mt-3 text-lg font-bold tracking-tight text-mtext sm:text-xl">{title}</h1>
          <p className="mt-1 text-xs text-stext sm:text-sm">{subtitle}</p>
        </div>

        <div className="rounded bg-card p-5 shadow-sm ring-1 ring-lborder sm:p-6">
          {children}
        </div>

        {footer && <div className="mt-5 text-center text-sm text-stext">{footer}</div>}
      </div>
    </div>
  );
}
