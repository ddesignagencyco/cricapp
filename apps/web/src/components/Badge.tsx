import React from 'react';
import LiveIndicator, { BlinkingDot } from './LiveIndicator';

export { BlinkingDot };

type PaletteName = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

/**
 * Each tone pairs a solid foreground with its own pre-mixed soft surface.
 * Both are theme tokens, so a badge is contrast-checked in light and dark
 * without relying on opacity, which is what made these look washed out.
 */
const palettes: Record<PaletteName, { fg: string; bg: string; ring: string }> = {
  primary: {
    fg: 'var(--color-badge-primary-fg)',
    bg: 'var(--color-badge-primary-bg)',
    ring: 'var(--color-badge-primary-fg)',
  },
  success: {
    fg: 'var(--color-badge-success-fg)',
    bg: 'var(--color-badge-success-bg)',
    ring: 'var(--color-badge-success-fg)',
  },
  warning: {
    fg: 'var(--color-badge-warning-fg)',
    bg: 'var(--color-badge-warning-bg)',
    ring: 'var(--color-badge-warning-fg)',
  },
  danger: {
    fg: 'var(--color-badge-danger-fg)',
    bg: 'var(--color-badge-danger-bg)',
    ring: 'var(--color-badge-danger-fg)',
  },
  neutral: {
    fg: 'var(--color-badge-neutral-fg)',
    bg: 'var(--color-badge-neutral-bg)',
    ring: 'var(--color-badge-neutral-fg)',
  },
};

const tonePalette: Record<string, PaletteName> = {
  primary: 'primary',
  accent: 'primary',
  info: 'primary',
  upcoming: 'primary',
  in_review: 'primary',
  playoffs: 'primary',
  success: 'success',
  completed: 'success',
  published: 'success',
  resolved: 'success',
  read: 'primary',
  active: 'success',
  approved: 'success',
  qualified: 'success',
  warning: 'warning',
  new: 'warning',
  pending: 'warning',
  scheduled: 'warning',
  postponed: 'warning',
  spam: 'warning',
  gold: 'warning',
  danger: 'danger',
  live: 'danger',
  cancelled: 'danger',
  canceled: 'danger',
  rejected: 'danger',
  failed: 'danger',
  error: 'danger',
  hate: 'danger',
  harassment: 'danger',
  eliminated: 'danger',
  abandoned: 'danger',
  inactive: 'neutral',
  draft: 'neutral',
  unknown: 'neutral',
  neutral: 'neutral',
};

function resolvePalette(tone: string): PaletteName {
  return tonePalette[tone.toLowerCase()] || 'neutral';
}

function titleCase(value: string): string {
  return value
    .trim()
    .replace(/[_-]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

const statusLabels: Record<string, string> = {
  live: 'Live',
  upcoming: 'Upcoming',
  completed: 'Completed',
  closed: 'Completed',
  ended: 'Completed',
  cancelled: 'Cancelled',
  canceled: 'Cancelled',
  postponed: 'Postponed',
  abandoned: 'Abandoned',
  published: 'Published',
  draft: 'Draft',
  in_review: 'In Review',
  scheduled: 'Scheduled',
  pending: 'Pending',
  new: 'New',
  read: 'Read',
  resolved: 'Resolved',
  approved: 'Approved',
  rejected: 'Rejected',
  active: 'Active',
  inactive: 'Inactive',
  not_started: 'Upcoming',
  unknown: 'Unknown',
  spam: 'Spam',
  hate: 'Hate',
  harassment: 'Harassment',
};

/** Provider aliases that should inherit another tone's colours. */
const statusToneAliases: Record<string, string> = {
  closed: 'completed',
  ended: 'completed',
  not_started: 'upcoming',
  canceled: 'cancelled',
};

export function normalizeStatus(status?: string | null): { label: string; tone: string } {
  const normalized = (status || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const tone = statusToneAliases[normalized] || normalized;
  return {
    label: statusLabels[normalized] || statusLabels[tone] || titleCase(status || '') || 'Unknown',
    tone: tone in tonePalette ? tone : 'neutral',
  };
}

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  tone?: string;
  className?: string;
}

export default function Badge({ children, tone = 'neutral', className = '', style, ...rest }: BadgeProps) {
  const current = palettes[resolvePalette(tone)];
  const classes = className.replace(/\buppercase\b/g, '').replace(/\s+/g, ' ').trim();
  return (
    <span
      {...rest}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold capitalize leading-none ${classes}`}
      style={{
        background: current.bg,
        color: current.fg,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${current.ring} 45%, transparent)`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, className = '' }: { status?: string | null; className?: string }) {
  const { label, tone } = normalizeStatus(status);
  // Live statuses render the shared live pill so that every "Live" label on the
  // site is the same element, rather than a badge that merely looks similar.
  if (tone === 'live') return <LiveIndicator label={label} className={className} />;
  return <Badge tone={tone} className={className}>{label}</Badge>;
}
