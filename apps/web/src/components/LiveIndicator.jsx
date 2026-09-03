'use client';

export default function LiveIndicator({ label = 'LIVE', className = '' }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`}>
      <span className="live-pulse h-2 w-2 rounded-full bg-accent2" />
      <span className="text-xs font-bold uppercase tracking-widest text-accent2">{label}</span>
    </span>
  );
}