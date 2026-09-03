'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Badge from './Badge';

export default function FilterBar({ filters, onChange, onClear, showActive = true }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {filters.map((f) => (
          <FilterSelect key={f.key} filter={f} onChange={(v) => onChange(f.key, v)} />
        ))}
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="rounded-lg px-3 py-2 text-xs font-semibold text-stext transition-colors hover:text-danger"
          >
            Clear all
          </button>
        )}
      </div>
      {showActive && (
        <ActiveFilters
          filters={filters}
          onRemove={(key) => onChange(key, '')}
          onClear={onClear}
        />
      )}
    </div>
  );
}

function FilterSelect({ filter, onChange }) {
  const [open, setOpen] = useState(false);
  const current = filter.options.find((o) => o.value === filter.value);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`flex items-center gap-2 rounded-xl bg-card px-3.5 py-2 text-sm font-semibold ring-1 transition-colors ${
          filter.value
            ? 'ring-accent/40 text-accent'
            : 'ring-lborder text-stext hover:text-mtext'
        }`}
      >
        {filter.label}: {current ? current.label : 'All'}
        <ChevronDown size={14} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-40 mt-2 w-56 rounded-xl bg-elevated p-1.5 shadow-xl shadow-shadow/40 ring-1 ring-lborder">
            <button
              type="button"
              onClick={() => {
                onChange('');
                setOpen(false);
              }}
              className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-card ${
                !filter.value ? 'text-accent' : 'text-mtext'
              }`}
            >
              All {filter.label}s
            </button>
            {filter.options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium hover:bg-card ${
                  filter.value === opt.value ? 'text-accent' : 'text-mtext'
                }`}
              >
                {opt.label}
                {filter.value === opt.value && <Badge tone="neutral">active</Badge>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ActiveFilters({ filters, onRemove, onClear }) {
  const active = filters.filter((f) => f.value);
  if (active.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-stext">Active:</span>
      {active.map((f) => (
        <button
          key={f.key}
          type="button"
          onClick={() => onRemove(f.key)}
          className="inline-flex items-center gap-1 rounded-full bg-accent/12 px-2.5 py-1 text-xs font-semibold text-accent ring-1 ring-inset ring-accent/25 hover:bg-accent/20"
        >
          {f.label}: {f.options.find((o) => o.value === f.value)?.label || f.value}
          <span className="text-stext">&times;</span>
        </button>
      ))}
      {onClear && (
        <button type="button" onClick={onClear} className="text-xs font-semibold text-stext hover:text-danger">
          Clear all
        </button>
      )}
    </div>
  );
}