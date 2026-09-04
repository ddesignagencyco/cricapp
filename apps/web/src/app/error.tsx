'use client';

import { useEffect } from 'react';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('PAK CRICZONE page error:', error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center justify-center px-4 py-24 text-center">
      <p className="font-mono text-7xl font-black text-danger/30">500</p>
      <h1 className="mt-4 text-2xl font-black tracking-tight text-mtext">
        Something went wrong
      </h1>
      <p className="mt-2 max-w-md text-sm text-stext">
        An unexpected error stopped this page from loading. Try again, or head back to the action.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-5 py-3 text-sm font-bold text-primary transition-transform hover:-translate-y-0.5"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
