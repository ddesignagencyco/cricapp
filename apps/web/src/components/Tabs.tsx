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
          : `inline-flex w-full max-w-full flex-wrap gap-1 rounded-xl bg-card p-1 ring-1 ring-lborder sm:w-auto ${className}`
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
            className={`flex items-center gap-1.5 font-semibold transition-colors ${pad} ${
              isTags
                ? `rounded-full border ${
                    isActive
                      ? 'border-accent bg-accent/10 text-accent'
                      : 'border-lborder bg-transparent text-stext hover:border-border-strong hover:text-mtext'
                  }`
                : `rounded-lg ${
                    isActive
                      ? 'bg-accent/15 text-accent ring-1 ring-inset ring-accent/25'
                      : 'text-stext hover:bg-elevated hover:text-mtext'
                  }`
            }`}
          >
            {Icon && <Icon size={size === 'sm' || isTags ? 14 : 16} strokeWidth={2.2} />}
            {tab.label}
            {typeof tab.count === 'number' && (
              <span className={`rounded-full px-1.5 text-xs font-medium ${isActive ? 'bg-[var(--color-brand)] text-white' : 'bg-elevated text-stext'}`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
