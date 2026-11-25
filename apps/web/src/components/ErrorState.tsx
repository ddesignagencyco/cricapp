'use client';

import { useRouter } from 'next/navigation';
import StatusIllustration from './StatusIllustration';

export default function ErrorState({
  title = 'Server unavailable',
  message = 'This content could not be loaded.',
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  const router = useRouter();
  const retry = onRetry ?? (() => router.refresh());

  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-lborder bg-card/40 px-6 py-12 text-center"
    >
      <StatusIllustration variant="error" size="md" />
      <h2 className="text-base font-bold text-mtext">{title}</h2>
      <p className="max-w-sm text-sm text-stext">{message}</p>
      <button
        type="button"
        onClick={retry}
        className="mt-1 rounded-md border border-lborder bg-card px-4 py-2 text-sm font-semibold text-mtext transition-colors hover:bg-[var(--color-row-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
      >
        Try again
      </button>
    </div>
  );
}
