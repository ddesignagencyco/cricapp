/**
 * Single source of truth for live styling. `BlinkingDot` is re-exported from
 * `Badge`, and `StatusBadge` renders this pill for any live status, so the
 * ticker, match cards, schedule, match detail and the admin panel all animate
 * identically.
 */

/** Blinking dot in the current text colour, with an expanding ring. */
export function BlinkingDot({ className = '' }: { className?: string }) {
  return (
    <span aria-hidden="true" className={`relative inline-flex h-1.5 w-1.5 shrink-0 ${className}`}>
      <span
        className="live-ping absolute inline-flex h-full w-full rounded-full"
        style={{ background: 'currentColor' }}
      />
      <span
        className="live-pulse relative inline-flex h-1.5 w-1.5 rounded-full"
        style={{ background: 'currentColor' }}
      />
    </span>
  );
}

interface LiveIndicatorProps {
  label?: string;
  className?: string;
}

export default function LiveIndicator({ label = 'LIVE', className = '' }: LiveIndicatorProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide leading-none text-danger ring-1 ring-inset ring-danger/30 ${className}`}
      style={{ background: 'var(--color-danger-soft)' }}
    >
      <BlinkingDot />
      {label}
    </span>
  );
}
