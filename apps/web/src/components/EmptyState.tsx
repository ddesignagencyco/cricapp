'use client';

import React from 'react';
import StatusIllustration from './StatusIllustration';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ComponentType<{ size?: number }>;
  children?: React.ReactNode;
}

export default function EmptyState({ title = 'Nothing found', message = '', children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2.5 rounded-2xl border border-dashed border-lborder bg-card/40 px-6 py-12 text-center">
      <StatusIllustration variant="empty" size="md" />
      <h3 className="text-base font-bold text-mtext">{title}</h3>
      {message ? <p className="max-w-sm text-sm text-stext">{message}</p> : null}
      {children}
    </div>
  );
}
