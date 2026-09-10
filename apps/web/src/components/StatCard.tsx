'use client';

import React from 'react';

const toneValue: Record<string, string> = { default: 'text-mtext', accent: 'text-accent', green: 'text-accent2', gold: 'text-gold', danger: 'text-danger' };

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  tone?: string;
  className?: string;
  compact?: boolean;
}

export default function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'default',
  className = '',
  compact = false,
}: StatCardProps) {
  return (
    <div
      className={`border border-lborder bg-card ${
        compact ? 'rounded-md p-3.5' : 'rounded-2xl border-t-2 p-5 ring-1 ring-lborder transition-transform duration-300 hover:-translate-y-0.5'
      } ${className}`}
    >
      <div className="flex items-center justify-between">
        <p className={`text-xs font-medium uppercase text-stext ${compact ? 'tracking-wider' : 'tracking-widest'}`}>{label}</p>
        {Icon && (
          <span className={`grid place-items-center rounded bg-elevated ${compact ? 'h-7 w-7' : 'h-8 w-8'}`}>
            <Icon size={compact ? 14 : 16} className="text-accent" />
          </span>
        )}
      </div>
      <p
        className={`font-mono font-semibold tabular-nums ${compact ? 'mt-1 text-lg' : 'mt-2 text-3xl font-black'} ${
          toneValue[tone] || toneValue.default
        }`}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-stext">{sub}</p>}
    </div>
  );
}
