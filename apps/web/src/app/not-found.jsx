import Link from 'next/link';
import { Home, Search } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-4 py-24 text-center">
      <p className="font-mono text-7xl font-black text-accent/30">404</p>
      <h1 className="mt-4 text-2xl font-black tracking-tight text-mtext">
        That page went for a duck
      </h1>
      <p className="mt-2 max-w-md text-sm text-stext">
        The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get you back to the action.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-primary transition-transform hover:-translate-y-0.5"
        >
          <Home size={16} /> Back to Home
        </Link>
        <Link
          href="/matches"
          className="inline-flex items-center gap-2 rounded-xl bg-card px-5 py-3 text-sm font-bold text-mtext ring-1 ring-lborder transition-transform hover:-translate-y-0.5 hover:ring-accent/40"
        >
          <Search size={16} /> Find a Match
        </Link>
      </div>
    </div>
  );
}