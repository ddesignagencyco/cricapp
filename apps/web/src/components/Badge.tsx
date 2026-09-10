import React from 'react';

const toneStyles: Record<string, { bg: string; fg: string; ring: string }> = {
  live: { bg: 'var(--color-danger-soft)', fg: 'var(--color-danger)', ring: 'var(--color-danger)' },
  upcoming: { bg: 'var(--color-info-soft)', fg: 'var(--color-info)', ring: 'var(--color-info)' },
  completed: { bg: 'var(--color-success-soft)', fg: 'var(--color-success)', ring: 'var(--color-success)' },
  published: { bg: 'var(--color-success-soft)', fg: 'var(--color-success)', ring: 'var(--color-success)' },
  active: { bg: 'var(--color-success-soft)', fg: 'var(--color-success)', ring: 'var(--color-success)' },
  approved: { bg: 'var(--color-success-soft)', fg: 'var(--color-success)', ring: 'var(--color-success)' },
  draft: { bg: 'var(--color-warning-soft)', fg: 'var(--color-warning)', ring: 'var(--color-warning)' },
  pending: { bg: 'var(--color-warning-soft)', fg: 'var(--color-warning)', ring: 'var(--color-warning)' },
  scheduled: { bg: 'var(--color-warning-soft)', fg: 'var(--color-warning)', ring: 'var(--color-warning)' },
  postponed: { bg: 'var(--color-warning-soft)', fg: 'var(--color-warning)', ring: 'var(--color-warning)' },
  in_review: { bg: 'var(--color-info-soft)', fg: 'var(--color-info)', ring: 'var(--color-info)' },
  rejected: { bg: 'var(--color-danger-soft)', fg: 'var(--color-danger)', ring: 'var(--color-danger)' },
  failed: { bg: 'var(--color-danger-soft)', fg: 'var(--color-danger)', ring: 'var(--color-danger)' },
  error: { bg: 'var(--color-danger-soft)', fg: 'var(--color-danger)', ring: 'var(--color-danger)' },
  cancelled: { bg: 'var(--color-surface-muted)', fg: 'var(--color-text-muted)', ring: 'var(--color-border)' },
  abandoned: { bg: 'var(--color-surface-muted)', fg: 'var(--color-text-muted)', ring: 'var(--color-border)' },
  inactive: { bg: 'var(--color-surface-muted)', fg: 'var(--color-text-muted)', ring: 'var(--color-border)' },
  neutral: { bg: 'var(--color-surface-muted)', fg: 'var(--color-text-secondary)', ring: 'var(--color-border)' },
  gold: { bg: 'var(--color-warning-soft)', fg: 'var(--color-warning)', ring: 'var(--color-warning)' },
  playoffs: { bg: 'var(--color-info-soft)', fg: 'var(--color-info)', ring: 'var(--color-info)' },
  qualified: { bg: 'var(--color-success-soft)', fg: 'var(--color-success)', ring: 'var(--color-success)' },
  eliminated: { bg: 'var(--color-danger-soft)', fg: 'var(--color-danger)', ring: 'var(--color-danger)' },
};

const statusLabels: Record<string, string> = {
  live: 'Live',
  upcoming: 'Upcoming',
  completed: 'Completed',
  closed: 'Completed',
  ended: 'Completed',
  cancelled: 'Cancelled',
  postponed: 'Postponed',
  abandoned: 'Abandoned',
  published: 'Published',
  draft: 'Draft',
  in_review: 'In Review',
  scheduled: 'Scheduled',
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  active: 'Active',
  inactive: 'Inactive',
};

export function normalizeStatus(status?: string | null): { label: string; tone: string } {
  const normalized = (status || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return {
    label: statusLabels[normalized] || (status?.trim() || 'Unknown'),
    tone: normalized in toneStyles ? normalized : 'neutral',
  };
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  tone?: string;
  className?: string;
}

export default function Badge({ children, tone = 'neutral', className = '', style, ...rest }: BadgeProps) {
  const current = toneStyles[tone.toLowerCase()] || toneStyles.neutral;
  return (
    <span
      {...rest}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide leading-none ${className}`}
      style={{
        background: current.bg,
        color: current.fg,
        boxShadow: `inset 0 0 0 1px ${current.ring}33`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, className = '' }: { status?: string | null; className?: string }) {
  const { label, tone } = normalizeStatus(status);
  return <Badge tone={tone} className={className}>{label}</Badge>;
}
