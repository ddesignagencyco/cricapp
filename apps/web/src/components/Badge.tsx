'use client';

import React from 'react';

const styles: Record<string, string> = {
  live: 'bg-accent2/15 text-accent2 ring-accent2/30',
  upcoming: 'bg-accent/15 text-accent ring-accent/30',
  completed: 'bg-gold/15 text-gold ring-gold/30',
  error: 'bg-danger/15 text-danger ring-danger/30',
  neutral: 'bg-stext/15 text-stext ring-stext/30',
  gold: 'bg-gold/15 text-gold ring-gold/30',
  qualified: 'bg-accent2/15 text-accent2 ring-accent2/30',
  playoffs: 'bg-accent/15 text-accent ring-accent/30',
  eliminated: 'bg-danger/15 text-danger ring-danger/30',
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
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ring-inset ${styles[tone] || styles.neutral} ${className}`}
    >
      {children}
    </span>
  );
}
