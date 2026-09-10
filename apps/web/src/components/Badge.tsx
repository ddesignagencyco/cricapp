'use client';

import React from 'react';

const styles: Record<string, string> = {
  live: 'bg-accent2/20 text-accent2 ring-accent2/30',
  upcoming: 'bg-accent/20 text-accent ring-accent/30',
  completed: 'bg-gold/20 text-gold ring-gold/30',
  cancelled: 'bg-stext/20 text-stext ring-stext/30',
  error: 'bg-danger/20 text-danger ring-danger/30',
  neutral: 'bg-stext/15 text-stext ring-stext/20',
  gold: 'bg-gold/20 text-gold ring-gold/30',
  qualified: 'bg-accent2/20 text-accent2 ring-accent2/30',
  playoffs: 'bg-accent/20 text-accent ring-accent/30',
  eliminated: 'bg-danger/20 text-danger ring-danger/30',
};

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  tone?: string;
  className?: string;
}

export default function Badge({ children, tone = 'neutral', className = '', ...rest }: BadgeProps) {
  return (
    <span
      {...rest}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide ring-1 ring-inset ${styles[tone] || styles.neutral} ${className}`}
    >
      {children}
    </span>
  );
}
