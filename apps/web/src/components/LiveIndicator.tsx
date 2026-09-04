'use client';

interface LiveIndicatorProps {
  label?: string;
  className?: string;
}

export default function LiveIndicator({ label = 'LIVE', className = '' }: LiveIndicatorProps) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-md bg-accent2/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-accent2 ring-1 ring-inset ring-accent2/40 ${className}`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="live-ping absolute inline-flex h-full w-full rounded-full bg-accent2" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-accent2 shadow-[0_0_6px_rgba(0,230,118,0.9)]" />
      </span>
      {label}
    </span>
  );
}
