'use client';

import { AlertCircle } from 'lucide-react';

export default function ErrorState({
  message = 'This content could not be loaded.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center rounded border border-danger/40 bg-danger-soft px-6 py-12 text-center">
      <AlertCircle size={24} className="text-danger" aria-hidden="true" />
      <h2 className="mt-3 text-base font-semibold text-mtext">Unable to load content</h2>
      <p className="mt-1 max-w-md text-sm text-stext">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 rounded border border-danger/50 px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"
        >
          Try again
        </button>
      )}
    </div>
  );
}
