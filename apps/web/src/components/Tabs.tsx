'use client';

import React from 'react';
import type { TabItem } from '../types/index';

interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (_key: string) => void;
  className?: string;
  size?: string;
  variant?: 'pills' | 'tags';
}

export default function Tabs({ tabs, active, onChange, className = '', size = 'md', variant = 'pills' }: TabsProps) {
  const isTags = variant === 'tags';
  const pad = isTags ? 'px-2.5 py-1 text-xs' : size === 'sm' ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm';
  return (
    <div
      className={
        isTags
          ? `flex flex-wrap gap-1.5 ${className}`
          : `tabs-segment w-full max-w-full sm:w-auto ${className}`
      }
      role="tablist"
    >
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        const Icon = tab.icon;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`tab-pill flex items-center gap-1.5 ${pad} ${
              isTags
                ? `rounded-full border ${
                    isActive
                      ? 'btn-brand border-transparent'
                      : 'border-lborder bg-transparent text-stext hover:border-border-strong hover:text-mtext'
                  }`
                : `rounded-md ${
                    isActive
                      ? 'btn-brand shadow-sm'
                      : 'text-stext hover:bg-[var(--color-row-hover)] hover:text-mtext'
                  }`
            }`}
          >
            {Icon && <Icon size={size === 'sm' || isTags ? 14 : 16} strokeWidth={2.2} aria-hidden="true" />}
            {tab.label}
            {typeof tab.count === 'number' && (
              <span
                className={`rounded-full px-1.5 text-xs font-semibold tabular-nums ${
                  isActive ? 'bg-white/20 text-white' : 'bg-[var(--color-neutral-soft)] text-stext'
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
